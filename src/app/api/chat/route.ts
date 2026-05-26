import { NextRequest } from 'next/server'
import { searchSimilarDocs } from '@/core/vectorstore'
import { buildSystemPrompt } from '@/core/rag'
import { Message } from '@/shared/types'
import { getDefaultProvider, getProviderApiKey } from '@/core/settings'
import { runOpenAIChat, runAnthropicChat, runGroqChat, runGeminiChat, runHuggingFaceChat, runOllamaChat, extractRetryDelaySeconds } from '@/core/llm'

export const runtime = 'nodejs'

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
]

const AGENT_SDK_PACKAGE = '@nice-devone/agent-sdk'
const AGENT_SDK_NPM_URL = 'https://www.npmjs.com/package/@nice-devone/agent-sdk'

type ChatSource = { title: string; url: string }

function uniqueSources(sources: ChatSource[]): ChatSource[] {
  const seen = new Set<string>()
  const result: ChatSource[] = []

  for (const source of sources) {
    const url = source.url?.trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    result.push(source)
  }

  return result
}

function isLatestVersionQuestion(text: string): boolean {
  const normalized = text.toLowerCase()
  const asksLatest =
    normalized.includes('última versão') ||
    normalized.includes('ultima versao') ||
    normalized.includes('latest version') ||
    normalized.includes('versão mais recente') ||
    normalized.includes('versao mais recente') ||
    normalized.includes('qual vers')

  const mentionsSdk = normalized.includes('sdk') || normalized.includes('agent-sdk')

  return asksLatest && mentionsSdk
}

async function fetchLatestAgentSdkVersion(): Promise<{ version: string; publishedAt?: string } | null> {
  const encoded = encodeURIComponent(AGENT_SDK_PACKAGE)
  const registryUrl = `https://registry.npmjs.org/${encoded}`

  try {
    const response = await fetch(registryUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000), // Reduced from 8s to 3s (optional info)
    })

    if (!response.ok) return null

    const data = (await response.json()) as {
      'dist-tags'?: { latest?: string }
      time?: Record<string, string>
    }

    const version = data?.['dist-tags']?.latest
    if (!version) return null

    const publishedAt = data.time?.[version]
    return { version, publishedAt }
  } catch {
    return null
  }
}

// ─── Dicionário PT → EN técnico (NICE/CXone) ──────────────────────────────────
// Adiciona termos em inglês quando a query é em PT, melhorando recall em docs EN.
const PT_EN_TERMS: Array<{ patterns: RegExp; en: string }> = [
  // Copilot & sentiment
  { patterns: /(sentimento|sentimentos|humor)/i,                            en: 'sentiment positive negative neutral feeling emotion analysis' },
  { patterns: /\bcopilot\b/i,                                               en: 'copilot agent assist ai assistant CXone Copilot' },

  // Auth
  { patterns: /(autentica[çc][ãa]o|login|token|oauth)/i,                    en: 'authentication oauth token bearer access refresh login credentials' },

  // Reporting
  { patterns: /(relat[óo]rio|dashboard|m[ée]tricas|insight)/i,              en: 'reporting analytics reports dashboard insights metrics KPI' },

  // Release
  { patterns: /(release|vers[aã]o|versao|novidade)/i,                       en: 'release notes whats new changelog latest version update' },

  // Channels & contact
  { patterns: /(canal|canais|atendimento)/i,                                en: 'channel channels omnichannel contact center voice digital' },
  { patterns: /(chamada|chamadas|voz|telefone)/i,                           en: 'call calls voice interaction phone telephony inbound outbound' },

  // ACD / queue
  { patterns: /(fila|filas|roteamento|skill|skillset)/i,                    en: 'queue queues skill skillset ACD routing distribution' },

  // Agent
  { patterns: /(agente|agentes)/i,                                          en: 'agent agents user contact center agent' },
  { patterns: /(supervisor)/i,                                              en: 'supervisor manager team leader' },

  // Recording / transcription
  { patterns: /(grava[çc][ãa]o|gravar)/i,                                   en: 'recording call recording voice recording playback' },
  { patterns: /(transcri[çc][ãa]o|transcript)/i,                            en: 'transcription transcript speech-to-text STT' },

  // Studio / scripts
  { patterns: /(studio|script|fluxo)/i,                                     en: 'studio script flow IVR designer scripting' },

  // WFM / QM
  { patterns: /(wfm|workforce|escala|planejamento)/i,                       en: 'workforce management WFM scheduling forecasting adherence' },
  { patterns: /(quality|qm|monitoria|avalia)/i,                             en: 'quality management QM evaluation monitoring scoring' },

  // Events / webhooks
  { patterns: /(webhook|evento|eventos|event hub)/i,                        en: 'event hub webhook events streaming push notification' },

  // SDK / API
  { patterns: /(endpoint|api|rest)/i,                                       en: 'API endpoint REST request response HTTP' },

  // CRM / cases
  { patterns: /(ticket|caso|chamado)/i,                                     en: 'case ticket incident issue support' },
]

function expandQueryPtEn(query: string): string[] {
  const matched: string[] = []
  for (const { patterns, en } of PT_EN_TERMS) {
    if (patterns.test(query)) matched.push(en)
  }
  return matched
}

function buildRetrievalQuery(userMessage: string): string {
  const normalized = userMessage.toLowerCase()
  const mentionsSdk = /\bsdk\b/.test(normalized)
  const mentionsAgentSdk =
    normalized.includes('@nice-devone/agent-sdk') ||
    normalized.includes('agent-sdk') ||
    normalized.includes('agent sdk')

  const expansions: string[] = []

  if (mentionsSdk && !mentionsAgentSdk) {
    expansions.push('@nice-devone/agent-sdk NICE CXone Agent SDK npm github nice-devone')
  }

  // Expansão PT→EN técnica
  expansions.push(...expandQueryPtEn(userMessage))

  if (expansions.length === 0) return userMessage

  // Dedupe + concat
  const unique = Array.from(new Set(expansions))
  return `${userMessage}\n\nTermos relacionados (EN): ${unique.join(' ; ')}`
}

function isLikelyDomainQuestion(text: string): boolean {
  const normalized = text.toLowerCase()
  return DOMAIN_KEYWORDS.some(keyword => normalized.includes(keyword))
}

function isDefinitionQuestion(text: string): boolean {
  const normalized = text.toLowerCase().trim()
  return (
    normalized.startsWith('o que é ') ||
    normalized.startsWith('o que e ') ||
    normalized.startsWith('what is ') ||
    normalized.startsWith('define ')
  )
}

function isInconclusiveContext(params: {
  query: string
  relevantDocsCount: number
  relevantDocs: Array<{ metadata: { pageType?: string } }>
}): boolean {
  if (params.relevantDocsCount === 0) return true

  const defQ = isDefinitionQuestion(params.query)
  const strongTypes = new Set(['api', 'reference', 'guide'])
  const strongCount = params.relevantDocs.filter(d => strongTypes.has(d.metadata.pageType ?? '')).length

  if (defQ && strongCount === 0) return true
  if (params.relevantDocsCount < 2) return true

  return false
}

export async function POST(req: NextRequest) {
  const { messages, userName }: { messages: Message[]; userName?: string } = await req.json()

  if (!messages?.length) {
    return new Response('Messages required', { status: 400 })
  }

  const userMessage = messages[messages.length - 1].content
  console.log('[CHAT] 📨 New message:', {
    userMessage: userMessage.substring(0, 100),
    historyLength: messages.length - 1,
    userName,
  })

  const retrievalQuery = buildRetrievalQuery(userMessage)
  const history = messages.slice(0, -1)

  // Special case: latest SDK version question (very fast path)
  if (isLatestVersionQuestion(userMessage)) {
    console.log('[CHAT] ⚡ SDK version question detected - fast path')
    const latest = await fetchLatestAgentSdkVersion()
    if (latest) {
      const published = latest.publishedAt
        ? `\n- Publicada em: ${new Date(latest.publishedAt).toLocaleDateString('pt-BR')}`
        : ''
      const message =
        `Resposta direta:\nA versão mais recente do ${AGENT_SDK_PACKAGE} no NPM é **${latest.version}**.${published}` +
        `\n\nPróximo passo:\nConfirme no NPM: ${AGENT_SDK_NPM_URL}`

      return Response.json({
        message,
        sources: [{ title: `${AGENT_SDK_PACKAGE} (NPM)`, url: AGENT_SDK_NPM_URL }],
      })
    }
  }

  // PARALLELIZED: Get provider + RAG search at the same time
  console.log('[CHAT] 🔄 Starting parallel: provider + RAG search')
  const startTime = Date.now()
  const [provider] = await Promise.all([getDefaultProvider()])
  const relevantDocs = await searchSimilarDocs(retrievalQuery, 5, provider)
  const parallelTime = Date.now() - startTime
  console.log('[CHAT] ✅ Parallel done', {
    provider,
    docCount: relevantDocs.length,
    timeTaken: `${parallelTime}ms`,
  })

  // Avoid LLM calls for clearly out-of-scope prompts to reduce token usage.
  const strictDomainMode = (process.env.STRICT_DOMAIN_MODE ?? 'true') === 'true'
  const hasDomainSignal = isLikelyDomainQuestion(userMessage)
  const hasRelevantDocs = relevantDocs.length > 0

  // Off-topic gate: sem sinal de domínio E sem chunks relevantes → reject sem LLM.
  // (relevantDocs já vem [] quando nada bate o threshold de relevância no vectorstore)
  if (strictDomainMode && !hasDomainSignal && !hasRelevantDocs) {
    console.log('[CHAT] 🚫 Pergunta fora do escopo (sem sinal de domínio + sem chunks)')
    return Response.json({
      message:
        'Não localizei essa informação na documentação técnica da NICE CXone. Posso te ajudar com APIs, filas, ACD, Studio, autenticação e configuração da plataforma.',
      sources: [],
    })
  }

  const systemPrompt = buildSystemPrompt(relevantDocs, userName, {
    isDefinitionQuestion: isDefinitionQuestion(userMessage),
    isInconclusive: isInconclusiveContext({
      query: userMessage,
      relevantDocsCount: relevantDocs.length,
      relevantDocs,
    }),
  })

  let providerApiKey = await getProviderApiKey(provider)
  if (!providerApiKey && provider === 'gemini') {
    providerApiKey = process.env.GEMINI_API_KEY ?? null
  }

  // Ollama é local e não precisa de chave
  if (provider === 'ollama') {
    providerApiKey = providerApiKey ?? ''
  }

  if (!providerApiKey && provider !== 'ollama') {
    console.error(`[CHAT] ❌ Missing API key for provider: ${provider}`)
    return Response.json(
      {
        message: `Chave da LLM (${provider}) nao configurada. Acesse Configuracoes -> LLM / Chaves para salvar a API key.`,
        sources: [],
      },
      { status: 400 }
    )
  }

  const apiKey: string = providerApiKey ?? ''

  const sources = uniqueSources(relevantDocs.map(d => ({
    title: d.metadata.title,
    url: d.metadata.url,
  })))

  if (provider === 'openai' || provider === 'anthropic' || provider === 'groq' || provider === 'huggingface' || provider === 'ollama') {
    console.log(`[CHAT] 🤖 Starting ${provider.toUpperCase()} streaming`)
    try {
      const stream = new ReadableStream({
        async start(controller) {
          const enc = new TextEncoder()
          console.log(`[CHAT] 📡 Creating ${provider} generator`)
          const chatGenerator =
            provider === 'openai'
              ? runOpenAIChat({
                  apiKey,
                  systemPrompt,
                  history,
                  userMessage,
                })
              : provider === 'anthropic'
              ? runAnthropicChat({
                  apiKey,
                  systemPrompt,
                  history,
                  userMessage,
                })
              : provider === 'groq'
              ? runGroqChat({
                  apiKey,
                  systemPrompt,
                  history,
                  userMessage,
                })
              : provider === 'ollama'
              ? runOllamaChat({
                  apiKey,
                  systemPrompt,
                  history,
                  userMessage,
                })
              : runHuggingFaceChat({
                  apiKey,
                  systemPrompt,
                  history,
                  userMessage,
                })

          try {
            let chunkCount = 0
            console.log(`[CHAT] 🔄 Starting to stream chunks from ${provider}`)
            for await (const chunk of chatGenerator) {
              chunkCount++
              controller.enqueue(enc.encode(chunk))
            }
            console.log(`[CHAT] ✅ ${provider} sent ${chunkCount} chunks`)
            // Send sources as a special delimiter the client can parse
            if (sources.length > 0) {
              controller.enqueue(enc.encode(`\n\n__SOURCES__${JSON.stringify(sources)}`))
            }
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error)
            console.error(`[CHAT] ❌ ${provider} error:`, errMsg)
            controller.enqueue(enc.encode(`\n\nErro: Falha ao consultar ${provider}. Detalhe: ${errMsg}`))
          } finally {
            console.log(`[CHAT] 🏁 Closing ${provider} stream`)
            controller.close()
          }
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      console.error(`[CHAT] ❌ Stream error for ${provider}:`, errMsg)
      return Response.json(
        {
          message: `Falha ao consultar ${provider}. Detalhe: ${errMsg}`,
          sources,
        },
        { status: 200 }
      )
    }
  }

  let geminiResult: Awaited<ReturnType<typeof runGeminiChat>>
  try {
    geminiResult = await runGeminiChat({
      apiKey,
      systemPrompt,
      history,
      userMessage,
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[CHAT] ❌ Gemini fatal error:', errMsg)
    return Response.json(
      { message: `Falha ao consultar Gemini. Detalhe: ${errMsg}`, sources: [] },
      { status: 200 }
    )
  }

  // Handle rate limit error from Gemini
  if (geminiResult.rateLimitError) {
    console.warn('[CHAT] ⚠️ Gemini rate limit error detected')
    const retryAfter = extractRetryDelaySeconds(geminiResult.rateLimitError)
    const retryMessage =
      retryAfter != null
        ? `Tente novamente em cerca de ${retryAfter}s.`
        : 'Aguarde um momento e tente novamente.'

    const fallbackSources = uniqueSources(relevantDocs.slice(0, 3).map(d => ({
      title: d.metadata.title,
      url: d.metadata.url,
    })))

    const fallbackText =
      `Resposta direta:\nA API da Nixa atingiu o limite temporário de uso (quota/rate limit).\n\n` +
      `Próximo passo:\n${retryMessage}`

    return Response.json({
      message: fallbackText,
      sources: fallbackSources,
      retryAfterSeconds: retryAfter ?? undefined,
    }, {
      status: 200,
      headers: {
        ...(retryAfter != null ? { 'Retry-After': String(retryAfter) } : {}),
      },
    })
  }

  // Collect sources to send at the end as a JSON marker
  console.log('[CHAT] 🤖 Starting Gemini streaming')
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      let chunkCount = 0
      try {
        console.log('[CHAT] 🔄 Starting to stream chunks from Gemini')
        for await (const chunk of geminiResult.stream) {
          chunkCount++
          controller.enqueue(enc.encode(chunk))
        }
        console.log(`[CHAT] ✅ Gemini sent ${chunkCount} chunks`)
        // Send sources as a special delimiter the client can parse
        if (sources.length > 0) {
          controller.enqueue(enc.encode(`\n\n__SOURCES__${JSON.stringify(sources)}`))
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error)
        console.error('[CHAT] ❌ Gemini stream error:', errMsg)
        controller.enqueue(enc.encode(`\n\nErro: Falha ao consultar Gemini. Detalhe: ${errMsg}`))
      } finally {
        console.log('[CHAT] 🏁 Closing Gemini stream')
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
