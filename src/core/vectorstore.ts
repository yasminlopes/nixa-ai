import { DocChunk } from '@/shared/types'
import {
  getEmbeddingForProvider,
  getIndexingEmbeddingProvider,
  EMBEDDING_SCHEMA_VERSION,
  type EmbeddingProvider,
} from '@/core/embeddings'
import fs from 'fs/promises'
import path from 'path'

const LOCAL_STORE_PATH = path.join(process.cwd(), 'data', 'vectorstore.json')

/** Limite máximo do texto enviado ao provider de embedding (antes do truncamento por modelo). */
const MAX_EMBED_INPUT_CHARS = 2000

/** Tamanho máximo do cache de embeddings em memória (LRU simples). */
const EMBED_CACHE_LIMIT = 64

/**
 * Threshold mínimo de relevância no score híbrido (semântico + léxico).
 * Abaixo disso → tratamos como "sem match" e retornamos [].
 * Evita injetar chunks de baixa similaridade que causam alucinação off-topic.
 */
const MIN_HYBRID_RELEVANCE = 0.22

/** Threshold quando o embedding falha e caímos no fallback puramente léxico. */
const MIN_LEXICAL_RELEVANCE = 0.10

let embeddingsUnavailable = false
const embeddingCache = new Map<string, { embedding: number[]; model: string }>()

interface LocalStore {
  chunks: DocChunk[]
  updatedAt: string
  // A busca DEVE usar o mesmo provider/modelo/dimensão da indexação, senão os
  // vetores vivem em espaços diferentes e a similaridade vira ruído.
  embeddingProvider?: EmbeddingProvider
  embeddingModel?: string
  dims?: number
  schemaVersion?: number
}

let _localStore: LocalStore | null = null

async function getLocalStore(): Promise<LocalStore> {
  if (_localStore) return _localStore

  try {
    const data = await fs.readFile(LOCAL_STORE_PATH, 'utf-8')
    _localStore = JSON.parse(data) as LocalStore
  } catch {
    _localStore = { chunks: [], updatedAt: new Date().toISOString() }
  }

  // Backfill de índices legados (sem identidade de embedding): infere o provider
  // do env (default histórico) e a dimensão a partir do primeiro chunk.
  if (_localStore.chunks.length > 0 && !_localStore.embeddingProvider) {
    _localStore.embeddingProvider = getIndexingEmbeddingProvider()
    _localStore.dims = _localStore.chunks.find(chunk => chunk.embedding?.length)?.embedding.length
  }

  return _localStore
}

async function saveLocalStore(store: LocalStore): Promise<void> {
  _localStore = store
  try {
    await fs.mkdir(path.dirname(LOCAL_STORE_PATH), { recursive: true })
    await fs.writeFile(LOCAL_STORE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  } catch {
    // Filesystem read-only (ex: Vercel) — segue só com o cache em memória do processo.
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

const NICE_DOMAIN_SIGNALS = ['nice', 'cxone', 'incontact', 'nicedevone',
  'developer.niceincontact.com', 'help.nicecxone.com']

const THIRD_PARTY_NOISE_URL_PATTERNS = [
  'github.com/signup', 'github.com/join', 'github.com/login',
  'microsoft.com', 'slack.com', 'atlassian.com', 'jira.com',
]

const THIRD_PARTY_NOISE_CONTENT_PATTERNS = [
  'create your free account', 'sign up for github', 'start for free',
  'join github', 'already have an account',
]

function queryAllowsThirdParty(query: string): boolean {
  const queryLower = query.toLowerCase()
  return (
    queryLower.includes('github') || queryLower.includes('microsoft') || queryLower.includes('azure') ||
    queryLower.includes('slack')  || queryLower.includes('jira')       || queryLower.includes('atlassian')
  )
}

function hasNiceSignals(text: string): boolean {
  const lower = text.toLowerCase()
  return NICE_DOMAIN_SIGNALS.some(signal => lower.includes(signal))
}

function isLikelyThirdPartyNoise(doc: DocChunk): boolean {
  const url = (doc.metadata.url ?? '').toLowerCase()
  const title = (doc.metadata.title ?? '').toLowerCase()
  const head = doc.content.slice(0, 900).toLowerCase()
  const hasNoiseUrl = THIRD_PARTY_NOISE_URL_PATTERNS.some(pattern => url.includes(pattern))
  const hasNoiseContent = THIRD_PARTY_NOISE_CONTENT_PATTERNS.some(pattern =>
    head.includes(pattern) || title.includes(pattern)
  )
  const hasNiceCtx = hasNiceSignals(url) || hasNiceSignals(title) || hasNiceSignals(head)
  return (hasNoiseUrl || hasNoiseContent) && !hasNiceCtx
}

type ScoredDoc = { doc: DocChunk; score: number }

function filterDomainNoise(scored: ScoredDoc[], query: string): ScoredDoc[] {
  if (queryAllowsThirdParty(query)) return scored
  const filtered = scored.filter(({ doc }) => !isLikelyThirdPartyNoise(doc))
  return filtered.length > 0 ? filtered : scored
}

function lexicalSimilarity(query: string, content: string): number {
  const tokenize = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(token => token.length > 2)
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return 0
  const contentTokens = new Set(tokenize(content))
  let matches = 0
  for (const token of queryTokens) if (contentTokens.has(token)) matches++
  return matches / queryTokens.length
}

function tokenizeQuery(query: string): string[] {
  return query.toLowerCase().replace(/[^a-z0-9\s@._/-]/g, ' ').split(/\s+/).filter(token => token.length > 2)
}

function looksTechnicalQuery(query: string): boolean {
  const queryLower = query.toLowerCase()
  return ['api', 'sdk', 'auth', 'token', 'webhook', 'endpoint', 'código', 'codigo', 'code']
    .some(keyword => queryLower.includes(keyword))
}

function isLowQualityChunk(doc: DocChunk): boolean {
  const lowerUrl = (doc.metadata.url ?? '').toLowerCase()
  const lowerContent = doc.content.toLowerCase()
  if (lowerUrl.includes('/signup') || lowerUrl.includes('/login') || lowerUrl.includes('/join'))
    return true

  const hasBreadcrumb = !!(doc.metadata.breadcrumb && doc.metadata.breadcrumb.length > 0)
  if (doc.content.length < 60 && !hasBreadcrumb) return true

  if (
    lowerContent.includes('create your free account') ||
    lowerContent.includes('sign up for github') ||
    lowerContent.includes('already have an account') ||
    (lowerContent.includes('password') && lowerContent.length < 300)
  ) return true
  return false
}

function pageTypeBoost(pageType: DocChunk['metadata']['pageType'], technical: boolean): number {
  const type = pageType ?? 'other'
  if (technical) {
    if (type === 'api') return 0.12
    if (type === 'reference') return 0.1
    if (type === 'guide') return 0.04
    return 0
  }
  if (type === 'guide') return 0.05
  if (type === 'release') return 0.04
  return 0
}

function sourceAuthorityBoost(urlLower: string): number {
  if (urlLower.includes('developer.niceincontact.com'))             return  0.15
  if (urlLower.includes('help.nicecxone.com'))                      return  0.12
  if (urlLower.includes('github.com/nice-devone'))                  return  0.045
  if (urlLower.includes('npmjs.com/package/@nice-devone/agent-sdk')) return 0.04
  if (urlLower.includes('nice.com'))                                return  0.03
  if (urlLower.includes('github.com') && !urlLower.includes('nice-devone')) return -0.4
  if (urlLower.includes('microsoft.com') || urlLower.includes('azure.microsoft.com')) return -0.3
  if (urlLower.includes('google.com') && !urlLower.includes('niceincontact.com')) return -0.3
  return 0
}

function recencyBoost(crawledAt?: string): number {
  if (!crawledAt) return 0
  const ageDays = (Date.now() - Date.parse(crawledAt)) / 86_400_000
  if (ageDays <= 7)  return 0.06
  if (ageDays <= 30) return 0.04
  if (ageDays <= 90) return 0.02
  return 0
}

function rerankDocs(scored: ScoredDoc[], query: string): ScoredDoc[] {
  const tokens = tokenizeQuery(query)
  const technical = looksTechnicalQuery(query)
  const productTerms = ['copilot', 'skill', 'agent', 'skillset', 'cxone']
  const isProductTerm = productTerms.some(term => query.toLowerCase().includes(term))
  const queryLower = query.toLowerCase()
  const blacklisted = ['/signup', '/login', '/join', 'github.com/signup', 'github.com/join']
  const urlLower = blacklisted.map(pattern => pattern.toLowerCase())

  const reranked = scored
    .filter(({ doc }) => !isLowQualityChunk(doc))
    .map(({ doc, score }) => {
      const title = (doc.metadata.title ?? '').toLowerCase()
      const head  = doc.content.slice(0, 700).toLowerCase()
      const urlLc = doc.metadata.url.toLowerCase()
      let adjustedScore = score
      adjustedScore += pageTypeBoost(doc.metadata.pageType, technical)
      adjustedScore += sourceAuthorityBoost(urlLc)
      adjustedScore += recencyBoost(doc.metadata.crawledAt)

      let titleMatches = 0, headMatches = 0
      for (const token of tokens) {
        if (title.includes(token)) titleMatches++
        if (head.includes(token)) headMatches++
      }
      adjustedScore += titleMatches * 0.025 + headMatches * 0.01

      if (urlLower.some(pattern => urlLc.includes(pattern))) adjustedScore -= 0.5

      const breadcrumb = (doc.metadata.breadcrumb ?? '').toLowerCase()
      if (breadcrumb && tokens.some(token => breadcrumb.includes(token))) adjustedScore += 0.08

      if (isProductTerm) {
        const hasNiceCtx = head.includes('nice') || head.includes('cxone') ||
          title.includes('nice') || title.includes('cxone') || urlLc.includes('nice')
        adjustedScore += hasNiceCtx ? 0.1 : -0.2
      }

      if (title.includes(queryLower)) adjustedScore += 0.15

      return { doc, score: adjustedScore }
    })
    .sort((a, b) => b.score - a.score)

  // NÃO corta em k aqui: o threshold e o top-k são aplicados DEPOIS do rerank (quem chama decide).
  const unique = new Map<string, ScoredDoc>()
  for (const item of reranked) {
    const fingerprint = `${item.doc.metadata.url}::${item.doc.content.slice(0, 120)}`
    if (!unique.has(fingerprint)) unique.set(fingerprint, item)
  }
  return Array.from(unique.values())
}

export async function getEmbedding(
  text: string,
  provider: EmbeddingProvider = 'gemini',
  apiKey = '',
  onWarning?: (msg: string) => void
): Promise<{ embedding: number[]; model: string }> {
  if (embeddingsUnavailable) throw new Error('EMBEDDINGS_UNAVAILABLE')
  const truncatedText = text.slice(0, MAX_EMBED_INPUT_CHARS)

  const cacheKey = `${provider}::${truncatedText}`
  const cached = embeddingCache.get(cacheKey)
  if (cached) return cached

  try {
    if (provider !== 'ollama' && !apiKey) {
      throw new Error(`Chave de API não encontrada para ${provider}.`)
    }

    const result = await getEmbeddingForProvider(provider, truncatedText, apiKey, onWarning)
    const entry = { embedding: result.embedding, model: result.model }

    embeddingCache.set(cacheKey, entry)
    if (embeddingCache.size > EMBED_CACHE_LIMIT) {
      const firstKey = embeddingCache.keys().next().value as string
      if (firstKey) embeddingCache.delete(firstKey)
    }

    return entry
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[EMBED] Failed: ${msg}`)
    // Marca como indisponível APENAS para problemas estruturais (chave ausente, auth, serviço fora).
    // Erros de input específico (contexto, content) são por-chunk, não bloqueiam outras chamadas.
    const isPermanent = (
      msg.includes('Chave de API') ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('fetch failed') ||
      msg.includes('UNAUTHORIZED') ||
      msg.includes('401') ||
      msg.includes('403')
    )
    if (isPermanent) embeddingsUnavailable = true
    throw err
  }
}

async function embedChunksWithConcurrencyControl(
  chunks: Omit<DocChunk, 'id' | 'embedding'>[],
  provider: EmbeddingProvider = 'gemini',
  apiKey = '',
  onWarning?: (msg: string) => void
): Promise<{ embedding: number[]; model: string; chunk: Omit<DocChunk, 'id' | 'embedding'> }[]> {
  // Rate limits: Gemini/OpenAI pedem serialização com pausa; Ollama é local e aguenta paralelo
  const concurrencyLimit = provider === 'ollama' ? 4 : 1
  const delayMs = provider === 'gemini' ? 700 : provider === 'openai' ? 500 : 0
  const results: { embedding: number[]; model: string; chunk: Omit<DocChunk, 'id' | 'embedding'> }[] = []
  const queue = [...chunks]

  const processChunk = async (chunk: Omit<DocChunk, 'id' | 'embedding'>) => {
    // O TÍTULO entra no embedding (é semântico). O breadcrumb NÃO — ele é metadata.
    const titlePrefix = chunk.metadata.title ? `[${chunk.metadata.title}] ` : ''
    const enhancedContent = titlePrefix + chunk.content

    let embedding: number[] = []
    let model = ''
    try {
      const embeddingResult = await getEmbedding(enhancedContent, provider, apiKey, onWarning)
      embedding = embeddingResult.embedding
      model = embeddingResult.model
    } catch (err) {
      if (String((err as { message?: string })?.message ?? '') !== 'EMBEDDINGS_UNAVAILABLE') throw err
      embeddingsUnavailable = true
    }
    return { embedding, model, chunk }
  }

  const worker = async () => {
    while (queue.length > 0) {
      const chunk = queue.shift()
      if (!chunk) break

      results.push(await processChunk(chunk))

      if (queue.length > 0 && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }

  const workers = Array(Math.min(concurrencyLimit, chunks.length))
    .fill(null)
    .map(() => worker())

  await Promise.all(workers)
  return results
}

export async function addDocChunks(
  chunks: Omit<DocChunk, 'id' | 'embedding'>[],
  provider: EmbeddingProvider = 'gemini',
  apiKey = '',
  onWarning?: (msg: string) => void
): Promise<void> {
  const sourceUrl = chunks[0]?.metadata?.url
  const isSingleSource = !!sourceUrl && chunks.every(chunk => chunk.metadata?.url === sourceUrl)

  const embeddedChunks = await embedChunksWithConcurrencyControl(chunks, provider, apiKey, onWarning)
  if (embeddedChunks.length === 0) return

  const store = await getLocalStore()

  // A busca usará EXATAMENTE este provider/modelo/dimensão, gravado a partir do
  // primeiro chunk realmente embutido.
  const firstEmbedded = embeddedChunks.find(embedded => embedded.embedding.length > 0)
  if (firstEmbedded) {
    store.embeddingProvider = provider
    store.embeddingModel = firstEmbedded.model || store.embeddingModel
    store.dims = firstEmbedded.embedding.length
    store.schemaVersion = EMBEDDING_SCHEMA_VERSION
  }

  if (isSingleSource) {
    store.chunks = store.chunks.filter(chunk => chunk.metadata.url !== sourceUrl)
  }

  for (const { embedding, chunk } of embeddedChunks) {
    store.chunks.push({
      id: crypto.randomUUID(),
      content: chunk.content,
      embedding,
      metadata: chunk.metadata,
    })
  }

  store.updatedAt = new Date().toISOString()
  await saveLocalStore(store)
}

export interface SearchResult {
  documents: DocChunk[]
  scored: Array<{ doc: DocChunk; score: number }>
  usedLexicalFallback: boolean
  embeddingModel?: string
}

/**
 * Busca híbrida.
 * - `semanticQuery`: pergunta ORIGINAL limpa → vira o embedding (sem poluição).
 * - `lexicalQuery`: pergunta + termos expandidos → alimenta só o canal léxico.
 *
 * Ordem: pool (top N por score bruto, SEM threshold) → rerank do pool inteiro →
 * threshold PÓS-rerank → top-k. Assim os boosts do rerank podem resgatar bons
 * documentos que o threshold cru descartaria.
 *
 * O embedding da query usa SEMPRE o provider/modelo gravado no índice — nunca o
 * LLM de chat. Se a dimensão não bater, cai no léxico (sem fingir similaridade).
 */
export async function searchSimilarDocs(params: {
  semanticQuery: string
  lexicalQuery: string
  k?: number
  apiKey?: string
}): Promise<SearchResult> {
  const { semanticQuery, lexicalQuery } = params
  const k = params.k ?? 5
  const store = await getLocalStore()
  if (store.chunks.length === 0) {
    return { documents: [], scored: [], usedLexicalFallback: false }
  }

  const queryWords = semanticQuery.trim().split(/\s+/).filter(Boolean).length
  const isShortQuery = queryWords <= 2
  const semanticWeight = isShortQuery ? 0.5 : 0.75
  const lexicalWeight  = isShortQuery ? 0.5 : 0.25
  const candidatePoolSize = Math.max(k * 4, 16)
  const embeddingProvider = store.embeddingProvider ?? getIndexingEmbeddingProvider()

  const finalize = (basePool: ScoredDoc[], threshold: number, usedLexicalFallback: boolean): SearchResult => {
    const pool = filterDomainNoise(basePool, semanticQuery)
    const reranked = rerankDocs(pool, semanticQuery)
    const relevant = reranked.filter(scoredDoc => scoredDoc.score >= threshold).slice(0, k)
    return {
      documents: relevant.map(scoredDoc => scoredDoc.doc),
      scored: relevant,
      usedLexicalFallback,
      embeddingModel: store.embeddingModel,
    }
  }

  try {
    const { embedding: queryEmbedding } = await getEmbedding(semanticQuery, embeddingProvider, params.apiKey ?? '')

    // Se a dimensão da query não bate com a do índice, o cosine seria ruído.
    if (store.dims && queryEmbedding.length !== store.dims) {
      console.warn(`[VECTORSTORE] dim mismatch (query=${queryEmbedding.length}, índice=${store.dims}) — reindexe. Fallback léxico.`)
      throw new Error('EMBEDDING_DIM_MISMATCH')
    }

    const basePool = store.chunks
      .map(chunk => ({
        doc: chunk,
        score:
          cosineSimilarity(queryEmbedding, chunk.embedding) * semanticWeight +
          lexicalSimilarity(lexicalQuery, chunk.content) * lexicalWeight,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, candidatePoolSize)

    return finalize(basePool, MIN_HYBRID_RELEVANCE, false)
  } catch (err) {
    console.error('[VECTORSTORE] busca semântica falhou, fallback léxico:', err instanceof Error ? err.message : err)
    const basePool = store.chunks
      .map(chunk => ({ doc: chunk, score: lexicalSimilarity(lexicalQuery, chunk.content) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, candidatePoolSize)

    return finalize(basePool, MIN_LEXICAL_RELEVANCE, true)
  }
}

export async function getStoreStats(): Promise<{ count: number; sources: string[] }> {
  const store = await getLocalStore()
  const sources = Array.from(new Set(store.chunks.map(chunk => chunk.metadata.source).filter(Boolean)))
  return { count: store.chunks.length, sources }
}

export async function getIndexedUrlsWithDates(): Promise<Map<string, string>> {
  const store = await getLocalStore()
  const result = new Map<string, string>()
  for (const chunk of store.chunks) {
    const url = chunk.metadata.url
    const crawledAt = chunk.metadata.crawledAt
    if (url && crawledAt && !result.has(url)) {
      result.set(url, crawledAt)
    }
  }
  return result
}

/** Hash de conteúdo já indexado para uma URL (page-level). Permite pular re-embed
 *  quando o conteúdo não mudou, mesmo que a página tenha sido re-crawleada. */
export async function getIndexedContentHash(url: string): Promise<string | undefined> {
  const store = await getLocalStore()
  return store.chunks.find(chunk => chunk.metadata.url === url)?.metadata.contentHash
}

export function isUrlStale(crawledAt: string | undefined, maxAgeDays = 14): boolean {
  if (!crawledAt) return true
  const ts = Date.parse(crawledAt)
  if (Number.isNaN(ts)) return true
  return (Date.now() - ts) / 86_400_000 > maxAgeDays
}

export async function clearStore(): Promise<void> {
  _localStore = { chunks: [], updatedAt: new Date().toISOString() }
  await saveLocalStore(_localStore)
}
