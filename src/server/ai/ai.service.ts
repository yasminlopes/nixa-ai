import { getIndexingEmbeddingProvider } from '@/core/embeddings';
import { type Provider, PROVIDERS } from '@/core/providers';
import {
  type ApiKeyMap,
  getKeyForProvider,
  MissingApiKeyError,
} from '@/core/settings/provider-key-service';
import { Message } from '@/shared/types';

import { buildPrompt } from './prompt.service';
import { extractRetryDelaySeconds, generate } from './providers';
import { isLikelyDomainQuestion, retrieve } from './retrieval.service';

export type ChatSource = { title: string; url: string };

/**
 * Resultado normalizado de `askNixa`. A route decide o HTTP a partir daqui:
 * - `message`: resposta pronta (fast-path, off-topic, chave ausente, rate limit,
 *   falha) — vira JSON. `status`/`retryAfterSeconds` são dicas de transporte.
 * - `stream`: geração em andamento — a route faz o streaming e anexa as sources.
 */
export type AskNixaResult =
  | {
      kind: 'message';
      message: string;
      sources: ChatSource[];
      status?: number;
      retryAfterSeconds?: number;
    }
  | { kind: 'stream'; stream: AsyncIterable<string>; sources: ChatSource[] };

export interface AskNixaParams {
  messages: Message[];
  userName?: string;
  provider?: Provider;
  apiKeys?: ApiKeyMap;
}

const AGENT_SDK_PACKAGE = '@nice-devone/agent-sdk';
const AGENT_SDK_NPM_URL = 'https://www.npmjs.com/package/@nice-devone/agent-sdk';

/**
 * Filtra os candidatos (docs recuperados) para só as fontes que o modelo REALMENTE
 * citou na resposta — o prompt pede citação inline `[Título](URL)`, então a URL
 * aparece no texto. Resolve o problema de "fontes exibidas ≠ fontes usadas".
 * Se o modelo não citou nenhuma, retorna [] (honesto: nada foi fundamentado numa
 * fonte específica) em vez de listar tudo que foi buscado.
 */
export function selectCitedSources(answer: string, candidates: ChatSource[]): ChatSource[] {
  return candidates.filter((source) => source.url && answer.includes(source.url));
}

function uniqueSources(sources: ChatSource[]): ChatSource[] {
  const seen = new Set<string>();
  const result: ChatSource[] = [];

  for (const source of sources) {
    const url = source.url?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    result.push(source);
  }

  return result;
}

function isLatestVersionQuestion(text: string): boolean {
  const normalized = text.toLowerCase();
  const asksLatest =
    normalized.includes('última versão') ||
    normalized.includes('ultima versao') ||
    normalized.includes('latest version') ||
    normalized.includes('versão mais recente') ||
    normalized.includes('versao mais recente') ||
    normalized.includes('qual vers');

  const mentionsSdk = normalized.includes('sdk') || normalized.includes('agent-sdk');

  return asksLatest && mentionsSdk;
}

async function fetchLatestAgentSdkVersion(): Promise<{
  version: string;
  publishedAt?: string;
} | null> {
  const encoded = encodeURIComponent(AGENT_SDK_PACKAGE);
  const registryUrl = `https://registry.npmjs.org/${encoded}`;

  try {
    const response = await fetch(registryUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      'dist-tags'?: { latest?: string };
      time?: Record<string, string>;
    };

    const version = data?.['dist-tags']?.latest;
    if (!version) return null;

    const publishedAt = data.time?.[version];
    return { version, publishedAt };
  } catch {
    return null;
  }
}

/**
 * Envolve o stream do provider num gerador resiliente: erros durante a iteração
 * viram uma linha de erro amigável (o detalhe fica só no log do servidor) em vez
 * de derrubar a resposta. Assim a route só precisa iterar, sem try/catch por
 * provider.
 */
async function* resilientStream(
  stream: AsyncIterable<string>,
  providerLabel: string,
): AsyncIterable<string> {
  try {
    yield* stream;
  } catch (error) {
    console.error(
      `[AI] ${providerLabel} stream error:`,
      error instanceof Error ? error.message : error,
    );
    yield `\n\nErro: Falha ao consultar ${providerLabel}. Verifique se a chave configurada é válida.`;
  }
}

/**
 * Orquestra uma resposta completa da Nixa: fast-paths → retrieval → prompt →
 * geração. Não lança para erros de provider — eles viram um `message`/stream
 * amigável.
 */
export async function askNixa(params: AskNixaParams): Promise<AskNixaResult> {
  const { messages, userName } = params;

  const userMessage = messages[messages.length - 1].content;
  const history = messages.slice(0, -1);
  const provider: Provider = params.provider ?? 'gemini';
  const providerLabel = PROVIDERS[provider].label;
  const apiKeys = params.apiKeys;

  const embeddingProvider = getIndexingEmbeddingProvider();
  let embeddingApiKey = '';
  try {
    embeddingApiKey = getKeyForProvider(embeddingProvider, apiKeys);
  } catch {
    // Sem chave do provider de embedding → a busca cai no canal léxico.
  }

  if (isLatestVersionQuestion(userMessage)) {
    const latest = await fetchLatestAgentSdkVersion();
    if (latest) {
      const published = latest.publishedAt
        ? `\n- Publicada em: ${new Date(latest.publishedAt).toLocaleDateString('pt-BR')}`
        : '';
      const message =
        `Resposta direta:\nA versão mais recente do ${AGENT_SDK_PACKAGE} no NPM é **${latest.version}**.${published}` +
        `\n\nPróximo passo:\nConfirme no NPM: ${AGENT_SDK_NPM_URL}`;

      return {
        kind: 'message',
        message,
        sources: [{ title: `${AGENT_SDK_PACKAGE} (NPM)`, url: AGENT_SDK_NPM_URL }],
      };
    }
  }

  const retrieval = await retrieve({ question: userMessage, embeddingApiKey });
  const documents = retrieval.documents;

  if (process.env.RAG_DEBUG === 'true') {
    console.log(
      '[RAG]',
      JSON.stringify({
        queryOriginal: retrieval.queryOriginal,
        queryExpanded: retrieval.queryExpanded,
        confidence: retrieval.confidence,
        usedLexicalFallback: retrieval.usedLexicalFallback,
        docs: retrieval.scored,
      }),
    );
  }

  const strictDomainMode = (process.env.STRICT_DOMAIN_MODE ?? 'true') === 'true';
  const hasDomainSignal = isLikelyDomainQuestion(userMessage);
  const { confidence } = retrieval;

  const shouldAbstain =
    confidence === 'none' ||
    (strictDomainMode && confidence === 'low') ||
    (strictDomainMode && !hasDomainSignal && confidence !== 'high');

  if (shouldAbstain) {
    return {
      kind: 'message',
      message:
        'Não localizei informação suficiente sobre isso na documentação oficial da NICE/CXone para responder com segurança. Tente reformular a pergunta ou consulte APIs, filas, ACD, Studio, Copilot, autenticação e configuração da plataforma.',
      sources: [],
    };
  }

  const systemPrompt = buildPrompt({ question: userMessage, documents, userName });

  let apiKey: string;
  try {
    apiKey = getKeyForProvider(provider, apiKeys);
  } catch (error) {
    if (error instanceof MissingApiKeyError) {
      return {
        kind: 'message',
        message: `Chave da LLM (${providerLabel}) não configurada. Acesse LLM / Chaves para salvar a sua API key.`,
        sources: [],
        status: 400,
      };
    }
    throw error;
  }

  const sources = uniqueSources(
    documents.map((doc) => ({
      title: doc.metadata.title,
      url: doc.metadata.url,
    })),
  );

  let result;
  try {
    result = await generate(provider, { apiKey, systemPrompt, history, userMessage });
  } catch (error) {
    console.error(`[AI] ${providerLabel} error:`, error instanceof Error ? error.message : error);
    return {
      kind: 'message',
      message: `Falha ao consultar ${providerLabel}. Verifique se a chave configurada é válida.`,
      sources: [],
    };
  }

  if (result.rateLimitError) {
    const retryAfter = extractRetryDelaySeconds(result.rateLimitError);
    const retryMessage =
      retryAfter != null
        ? `Tente novamente em cerca de ${retryAfter}s.`
        : 'Aguarde um momento e tente novamente.';

    const fallbackText =
      `Resposta direta:\nA API da Nixa atingiu o limite temporário de uso (quota/rate limit).\n\n` +
      `Próximo passo:\n${retryMessage}`;

    return {
      kind: 'message',
      message: fallbackText,
      sources: uniqueSources(
        documents.slice(0, 3).map((doc) => ({
          title: doc.metadata.title,
          url: doc.metadata.url,
        })),
      ),
      retryAfterSeconds: retryAfter ?? undefined,
    };
  }

  return {
    kind: 'stream',
    stream: resilientStream(result.stream, providerLabel),
    sources,
  };
}
