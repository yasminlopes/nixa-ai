import { searchSimilarDocs } from '@/core/vectorstore';
import { DocChunk } from '@/shared/types';

const DOMAIN_KEYWORDS = [
  'nice',
  'cxone',
  'incontact',
  'contact center',
  'contact-center',
  'acd',
  'ivr',
  'omnichannel',
  'agent',
  'queue',
  'fila',
  'roteamento',
  'studio',
  'script',
  'sdk',
  'agent sdk',
  '@nice-devone/agent-sdk',
  'wfm',
  'qm',
  'api',
  'webhook',
  'autenticação',
  'autenticacao',
  'token',
  'reporting',
  'relatório',
  'relatorio',
];

const PT_EN_TERMS: Array<{ patterns: RegExp; en: string }> = [
  {
    patterns: /(sentimento|sentimentos|humor)/i,
    en: 'sentiment positive negative neutral feeling emotion analysis',
  },
  { patterns: /\bcopilot\b/i, en: 'copilot agent assist ai assistant CXone Copilot' },

  {
    patterns: /(autentica[çc][ãa]o|login|token|oauth)/i,
    en: 'authentication oauth token bearer access refresh login credentials',
  },

  {
    patterns: /(relat[óo]rio|dashboard|m[ée]tricas|insight)/i,
    en: 'reporting analytics reports dashboard insights metrics KPI',
  },

  {
    patterns: /(release|vers[aã]o|versao|novidade)/i,
    en: 'release notes whats new changelog latest version update',
  },

  {
    patterns: /(canal|canais|atendimento)/i,
    en: 'channel channels omnichannel contact center voice digital',
  },
  {
    patterns: /(chamada|chamadas|voz|telefone)/i,
    en: 'call calls voice interaction phone telephony inbound outbound',
  },

  {
    patterns: /(fila|filas|roteamento|skill|skillset)/i,
    en: 'queue queues skill skillset ACD routing distribution',
  },

  { patterns: /(agente|agentes)/i, en: 'agent agents user contact center agent' },
  { patterns: /(supervisor)/i, en: 'supervisor manager team leader' },

  { patterns: /(grava[çc][ãa]o|gravar)/i, en: 'recording call recording voice recording playback' },
  {
    patterns: /(transcri[çc][ãa]o|transcript)/i,
    en: 'transcription transcript speech-to-text STT',
  },

  { patterns: /(studio|script|fluxo)/i, en: 'studio script flow IVR designer scripting' },

  {
    patterns: /(wfm|workforce|escala|planejamento)/i,
    en: 'workforce management WFM scheduling forecasting adherence',
  },
  {
    patterns: /(quality|qm|monitoria|avalia)/i,
    en: 'quality management QM evaluation monitoring scoring',
  },

  {
    patterns: /(webhook|evento|eventos|event hub)/i,
    en: 'event hub webhook events streaming push notification',
  },

  { patterns: /(endpoint|api|rest)/i, en: 'API endpoint REST request response HTTP' },

  { patterns: /(ticket|caso|chamado)/i, en: 'case ticket incident issue support' },
];

function expandQueryPtEn(query: string): string[] {
  const matched: string[] = [];
  for (const { patterns, en } of PT_EN_TERMS) {
    if (patterns.test(query)) matched.push(en);
  }
  return matched;
}

/**
 * Separa os dois canais de busca:
 * - `semantic`: a pergunta ORIGINAL limpa → vira o embedding (sem poluição).
 * - `lexical`: pergunta + termos expandidos (SDK, PT→EN) → só o canal léxico.
 * Antes, os termos expandidos entravam no texto embutido e diluíam o vetor.
 */
function buildRetrievalQuery(userMessage: string): { semantic: string; lexical: string } {
  const normalized = userMessage.toLowerCase();
  const mentionsSdk = /\bsdk\b/.test(normalized);
  const mentionsAgentSdk =
    normalized.includes('@nice-devone/agent-sdk') ||
    normalized.includes('agent-sdk') ||
    normalized.includes('agent sdk');

  const expansions: string[] = [];

  if (mentionsSdk && !mentionsAgentSdk) {
    expansions.push('@nice-devone/agent-sdk NICE CXone Agent SDK npm github nice-devone');
  }

  expansions.push(...expandQueryPtEn(userMessage));

  const unique = Array.from(new Set(expansions));
  return {
    semantic: userMessage,
    lexical: unique.length > 0 ? `${userMessage} ${unique.join(' ')}` : userMessage,
  };
}

export function isLikelyDomainQuestion(text: string): boolean {
  const normalized = text.toLowerCase();
  return DOMAIN_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function isDefinitionQuestion(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  return (
    normalized.startsWith('o que é ') ||
    normalized.startsWith('o que e ') ||
    normalized.startsWith('what is ') ||
    normalized.startsWith('define ')
  );
}

export function isInconclusiveContext(params: {
  query: string;
  relevantDocs: DocChunk[];
}): boolean {
  const count = params.relevantDocs.length;
  if (count === 0) return true;

  const defQ = isDefinitionQuestion(params.query);
  const strongTypes = new Set(['api', 'reference', 'guide']);
  const strongCount = params.relevantDocs.filter((doc) =>
    strongTypes.has(doc.metadata.pageType ?? ''),
  ).length;

  if (defQ && strongCount === 0) return true;
  if (count < 2) return true;

  return false;
}

export interface RetrievalResult {
  queryOriginal: string;
  queryExpanded: string;
  documents: DocChunk[];
  scored: Array<{ url: string; title: string; score: number }>;
  confidence: 'high' | 'medium' | 'low' | 'none';
  usedLexicalFallback: boolean;
}

function scoreConfidence(scored: Array<{ score: number }>): RetrievalResult['confidence'] {
  if (scored.length === 0) return 'none';
  const top = scored[0].score;
  if (top >= 0.6 && scored.length >= 2) return 'high';
  if (top >= 0.4) return 'medium';
  return 'low';
}

/**
 * Busca os documentos relevantes e devolve um objeto rico (query original +
 * expandida, docs, scores, confiança) — facilita debug, métricas e as próximas
 * etapas do pipeline. O embedding usa o provider FIXO do índice, não o LLM de
 * chat, então `provider` não é mais necessário aqui.
 */
export async function retrieve(params: {
  question: string;
  k?: number;
  embeddingApiKey?: string;
}): Promise<RetrievalResult> {
  const { semantic, lexical } = buildRetrievalQuery(params.question);
  const result = await searchSimilarDocs({
    semanticQuery: semantic,
    lexicalQuery: lexical,
    k: params.k ?? 5,
    apiKey: params.embeddingApiKey,
  });

  return {
    queryOriginal: params.question,
    queryExpanded: lexical,
    documents: result.documents,
    scored: result.scored.map((scoredDoc) => ({
      url: scoredDoc.doc.metadata.url,
      title: scoredDoc.doc.metadata.title,
      score: Number(scoredDoc.score.toFixed(4)),
    })),
    confidence: scoreConfidence(result.scored),
    usedLexicalFallback: result.usedLexicalFallback,
  };
}
