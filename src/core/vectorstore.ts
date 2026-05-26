import { DocChunk } from '@/shared/types'
import { getEmbeddingForProvider, type EmbeddingProvider } from '@/core/embeddings'
import { getProviderApiKey } from '@/core/settings'
import fs from 'fs/promises'
import path from 'path'

// ─── Config ─────────────────────────────────────────────────────────────────

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

// ─── State ───────────────────────────────────────────────────────────────────

let embeddingsUnavailable = false
const embeddingCache = new Map<string, number[]>()

// ─── Local JSON Storage ──────────────────────────────────────────────────────

interface LocalStore {
  chunks: DocChunk[]
  updatedAt: string
}

let _localStore: LocalStore | null = null

async function getLocalStore(): Promise<LocalStore> {
  if (_localStore) return _localStore

  try {
    const data = await fs.readFile(LOCAL_STORE_PATH, 'utf-8')
    _localStore = JSON.parse(data) as LocalStore
    console.log(`[VECTORSTORE] 📦 Carregado ${_localStore.chunks.length} chunks do storage local`)
  } catch {
    _localStore = { chunks: [], updatedAt: new Date().toISOString() }
    console.log('[VECTORSTORE] 📦 Criando novo storage local')
  }

  return _localStore
}

async function saveLocalStore(store: LocalStore): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_STORE_PATH), { recursive: true })
  await fs.writeFile(LOCAL_STORE_PATH, JSON.stringify(store, null, 2), 'utf-8')
  _localStore = store
  console.log(`[VECTORSTORE] 💾 Salvos ${store.chunks.length} chunks no storage local`)
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

// ─── Domain signals / noise filters ──────────────────────────────────────────

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
  const q = query.toLowerCase()
  return (
    q.includes('github') || q.includes('microsoft') || q.includes('azure') ||
    q.includes('slack')  || q.includes('jira')       || q.includes('atlassian')
  )
}

function hasNiceSignals(text: string): boolean {
  const lower = text.toLowerCase()
  return NICE_DOMAIN_SIGNALS.some(s => lower.includes(s))
}

function isLikelyThirdPartyNoise(doc: DocChunk): boolean {
  const url = (doc.metadata.url ?? '').toLowerCase()
  const title = (doc.metadata.title ?? '').toLowerCase()
  const head = doc.content.slice(0, 900).toLowerCase()
  const hasNoiseUrl = THIRD_PARTY_NOISE_URL_PATTERNS.some(p => url.includes(p))
  const hasNoiseContent = THIRD_PARTY_NOISE_CONTENT_PATTERNS.some(p =>
    head.includes(p) || title.includes(p)
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

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function lexicalSimilarity(query: string, content: string): number {
  const tokenize = (v: string) =>
    v.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2)
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return 0
  const contentTokens = new Set(tokenize(content))
  let matches = 0
  for (const t of queryTokens) if (contentTokens.has(t)) matches++
  return matches / queryTokens.length
}

function tokenizeQuery(query: string): string[] {
  return query.toLowerCase().replace(/[^a-z0-9\s@._/-]/g, ' ').split(/\s+/).filter(t => t.length > 2)
}

function looksTechnicalQuery(query: string): boolean {
  const q = query.toLowerCase()
  return ['api', 'sdk', 'auth', 'token', 'webhook', 'endpoint', 'código', 'codigo', 'code']
    .some(k => q.includes(k))
}

function isLowQualityChunk(doc: DocChunk): boolean {
  const lowerUrl = (doc.metadata.url ?? '').toLowerCase()
  const lowerContent = doc.content.toLowerCase()
  if (lowerUrl.includes('/signup') || lowerUrl.includes('/login') || lowerUrl.includes('/join'))
    return true

  // Chunks muito curtos só são descartados se NÃO tiverem breadcrumb (sem contexto = inútil)
  // e não tiverem estrutura técnica. Com breadcrumb, mesmo chunks curtos preservam contexto.
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
  const t = pageType ?? 'other'
  if (technical) {
    if (t === 'api') return 0.12
    if (t === 'reference') return 0.1
    if (t === 'guide') return 0.04
    return 0
  }
  if (t === 'guide') return 0.05
  if (t === 'release') return 0.04
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

function rerankDocs(scored: ScoredDoc[], query: string, k: number): DocChunk[] {
  const tokens = tokenizeQuery(query)
  const technical = looksTechnicalQuery(query)
  const productTerms = ['copilot', 'skill', 'agent', 'skillset', 'cxone']
  const isProductTerm = productTerms.some(term => query.toLowerCase().includes(term))
  const queryLower = query.toLowerCase()
  const blacklisted = ['/signup', '/login', '/join', 'github.com/signup', 'github.com/join']
  const urlLower = blacklisted.map(p => p.toLowerCase())

  const reranked = scored
    .filter(({ doc }) => !isLowQualityChunk(doc))
    .map(({ doc, score }) => {
      const title = (doc.metadata.title ?? '').toLowerCase()
      const head  = doc.content.slice(0, 700).toLowerCase()
      const urlLc = doc.metadata.url.toLowerCase()
      let s = score
      s += pageTypeBoost(doc.metadata.pageType, technical)
      s += sourceAuthorityBoost(urlLc)
      s += recencyBoost(doc.metadata.crawledAt)

      let titleMatches = 0, headMatches = 0
      for (const t of tokens) {
        if (title.includes(t)) titleMatches++
        if (head.includes(t)) headMatches++
      }
      s += titleMatches * 0.025 + headMatches * 0.01

      if (urlLower.some(p => urlLc.includes(p))) s -= 0.5

      const breadcrumb = (doc.metadata.breadcrumb ?? '').toLowerCase()
      if (breadcrumb && tokens.some(t => breadcrumb.includes(t))) s += 0.08

      if (isProductTerm) {
        const hasNiceCtx = head.includes('nice') || head.includes('cxone') ||
          title.includes('nice') || title.includes('cxone') || urlLc.includes('nice')
        s += hasNiceCtx ? 0.1 : -0.2
      }

      if (title.includes(queryLower)) s += 0.15

      return { doc, score: s }
    })
    .sort((a, b) => b.score - a.score)

  const unique = new Map<string, DocChunk>()
  for (const item of reranked) {
    const fp = `${item.doc.metadata.url}::${item.doc.content.slice(0, 120)}`
    if (!unique.has(fp)) unique.set(fp, item.doc)
    if (unique.size >= k) break
  }
  return Array.from(unique.values())
}

// ─── Embedding helpers ────────────────────────────────────────────────────────

export async function getEmbedding(
  text: string,
  provider: EmbeddingProvider = 'gemini',
  onWarning?: (msg: string) => void
): Promise<number[]> {
  if (embeddingsUnavailable) throw new Error('EMBEDDINGS_UNAVAILABLE')
  const safe = text.slice(0, MAX_EMBED_INPUT_CHARS)

  const cached = embeddingCache.get(safe)
  if (cached) {
    console.log('[EMBED] 💾 Cache hit')
    return cached
  }

  try {
    let apiKey: string | null = null

    switch (provider) {
      case 'gemini':
        apiKey = process.env.GEMINI_API_KEY ?? null
        break
      case 'openai':
        apiKey = (await getProviderApiKey(provider)) ?? process.env.OPENAI_API_KEY ?? null
        break
      case 'anthropic':
        apiKey = (await getProviderApiKey(provider)) ?? process.env.ANTHROPIC_API_KEY ?? null
        break
      case 'groq':
        apiKey = (await getProviderApiKey(provider)) ?? process.env.GROQ_API_KEY ?? null
        break
      case 'huggingface':
        apiKey = (await getProviderApiKey(provider)) ?? process.env.HUGGINGFACE_API_KEY ?? null
        break
      case 'ollama':
        apiKey = ''
        break
      default:
        throw new Error(`[EMBED] ❌ Provider desconhecido: ${provider}`)
    }

    if (apiKey === null) {
      throw new Error(`[EMBED] ❌ Chave de API não encontrada para ${provider}.`)
    }

    console.log(`[EMBED] 🔑 Provider: ${provider}`)
    const result = await getEmbeddingForProvider(provider, safe, apiKey, onWarning)

    embeddingCache.set(safe, result.embedding)
    if (embeddingCache.size > EMBED_CACHE_LIMIT) {
      const firstKey = embeddingCache.keys().next().value as string
      if (firstKey) embeddingCache.delete(firstKey)
    }

    return result.embedding
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[EMBED] ❌ Failed: ${msg}`)
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

// ─── Public API ───────────────────────────────────────────────────────────────

async function embedChunksWithConcurrencyControl(
  chunks: Omit<DocChunk, 'id' | 'embedding'>[],
  provider: EmbeddingProvider = 'gemini',
  onWarning?: (msg: string) => void
): Promise<{ embedding: number[]; chunk: Omit<DocChunk, 'id' | 'embedding'> }[]> {
  const concurrencyLimit = provider === 'gemini' ? 1 : provider === 'openai' ? 1 : provider === 'ollama' ? 4 : 2
  const delayMs = provider === 'gemini' ? 700 : provider === 'openai' ? 500 : provider === 'ollama' ? 0 : 300
  const results: { embedding: number[]; chunk: Omit<DocChunk, 'id' | 'embedding'> }[] = []
  const queue = [...chunks]
  let completed = 0

  console.log(`[EMBED] 🔄 Embedding ${chunks.length} chunks (provider: ${provider}, concurrency: ${concurrencyLimit})`)

  let chunkIndex = 0
  const processChunk = async (chunk: Omit<DocChunk, 'id' | 'embedding'>, index: number) => {
    const titlePrefix = chunk.metadata.title ? `[${chunk.metadata.title}] ` : ''
    const enhancedContent = titlePrefix + chunk.content

    let embedding: number[] = []
    try {
      console.log(`[EMBED] 📍 Chunk ${index}/${chunks.length}`)
      embedding = await getEmbedding(enhancedContent, provider, onWarning)
      completed++
    } catch (err) {
      if (String((err as { message?: string })?.message ?? '') !== 'EMBEDDINGS_UNAVAILABLE') throw err
      embeddingsUnavailable = true
      completed++
    }
    return { embedding, chunk }
  }

  const worker = async () => {
    while (queue.length > 0) {
      const chunk = queue.shift()
      if (!chunk) break

      const index = chunkIndex++
      const result = await processChunk(chunk, index)
      results.push(result)

      if (queue.length > 0 && delayMs > 0) {
        console.log(`[EMBED] ⏸️  Wait ${delayMs}ms (${completed}/${chunks.length})`)
        await new Promise(r => setTimeout(r, delayMs))
      }
    }
  }

  const workers = Array(Math.min(concurrencyLimit, chunks.length))
    .fill(null)
    .map(() => worker())

  await Promise.all(workers)
  console.log(`[EMBED] ✅ Completed ${chunks.length} chunks`)
  return results
}

export async function addDocChunks(
  chunks: Omit<DocChunk, 'id' | 'embedding'>[],
  provider: EmbeddingProvider = 'gemini',
  onWarning?: (msg: string) => void
): Promise<void> {
  console.log(`[VECTORSTORE] 📥 Adicionando ${chunks.length} chunks (provider: ${provider})`)

  const sourceUrl = chunks[0]?.metadata?.url
  const isSingleSource = !!sourceUrl && chunks.every(c => c.metadata?.url === sourceUrl)

  const embeddedChunks = await embedChunksWithConcurrencyControl(chunks, provider, onWarning)
  if (embeddedChunks.length === 0) return

  const store = await getLocalStore()

  if (isSingleSource) {
    store.chunks = store.chunks.filter(c => c.metadata.url !== sourceUrl)
    console.log(`[VECTORSTORE] 🗑️ Removidos chunks antigos de: ${sourceUrl}`)
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

export async function searchSimilarDocs(query: string, k = 5, provider: EmbeddingProvider = 'gemini'): Promise<DocChunk[]> {
  console.log(`[VECTORSTORE] 🔍 Buscando docs (query: "${query.substring(0, 50)}...", k: ${k})`)

  const store = await getLocalStore()
  if (store.chunks.length === 0) {
    console.log('[VECTORSTORE] ⚠️ Nenhum chunk indexado')
    return []
  }

  const queryWords = query.trim().split(/\s+/).filter(Boolean).length
  const isShortQuery = queryWords <= 2
  const semanticWeight = isShortQuery ? 0.5 : 0.75
  const lexicalWeight  = isShortQuery ? 0.5 : 0.25
  const candidatePoolSize = Math.max(k * 4, 16)

  try {
    const queryEmbedding = await getEmbedding(query, provider)

    const scored = filterDomainNoise(
      store.chunks.map(chunk => ({
        doc: chunk,
        score:
          cosineSimilarity(queryEmbedding, chunk.embedding) * semanticWeight +
          lexicalSimilarity(query, chunk.content) * lexicalWeight,
      })).sort((a, b) => b.score - a.score).slice(0, candidatePoolSize),
      query
    )

    const relevant = scored.filter(s => s.score >= MIN_HYBRID_RELEVANCE)
    if (relevant.length === 0) {
      console.log(`[VECTORSTORE] ⚠️ Nenhum chunk acima de ${MIN_HYBRID_RELEVANCE} (top: ${scored[0]?.score.toFixed(3) ?? 'n/a'})`)
      return []
    }
    return rerankDocs(relevant, query, k)
  } catch (err) {
    console.error('[VECTORSTORE] ❌ Erro na busca semântica, fallback léxico:', err)
    const scored = filterDomainNoise(
      store.chunks.map(chunk => ({
        doc: chunk,
        score: lexicalSimilarity(query, chunk.content),
      })).sort((a, b) => b.score - a.score).slice(0, candidatePoolSize),
      query
    )
    const relevant = scored.filter(s => s.score >= MIN_LEXICAL_RELEVANCE)
    if (relevant.length === 0) {
      console.log('[VECTORSTORE] ⚠️ Fallback léxico também não encontrou match relevante')
      return []
    }
    return rerankDocs(relevant, query, k)
  }
}

export async function getStoreStats(): Promise<{ count: number; sources: string[] }> {
  const store = await getLocalStore()
  const sources = Array.from(new Set(store.chunks.map(c => c.metadata.source).filter(Boolean)))
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
