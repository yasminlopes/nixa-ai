import * as lancedb from '@lancedb/lancedb'
import { DocChunk } from '@/shared/types'
import { getEmbeddingForProvider, type EmbeddingProvider } from '@/core/embeddings'
import { getProviderApiKey } from '@/core/settings'
import fs from 'fs/promises'
import path from 'path'

// ─── Config ─────────────────────────────────────────────────────────────────

const TABLE_NAME = 'docs'

// Free tier mode - set FREE_TIER=true to use local JSON storage instead of LanceDB
const IS_FREE_TIER = process.env.FREE_TIER === 'true'
const LOCAL_STORE_PATH = path.join(process.cwd(), 'data', 'vectorstore.json')

type LanceConnection = Awaited<ReturnType<typeof lancedb.connect>>
type LanceTable = Awaited<ReturnType<LanceConnection['openTable']>>

// ─── State ───────────────────────────────────────────────────────────────────

let warnedFallback = false
let embeddingsUnavailable = false
let _db: LanceConnection | null = null
let _table: LanceTable | null = null

// Simple embedding cache — avoids re-embedding identical queries within the same process
const embeddingCache = new Map<string, number[]>()
const EMBEDDING_CACHE_MAX = 64

// ─── Local JSON Storage (FREE_TIER mode) ──────────────────────────────────────

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

// ─── LanceDB connection ───────────────────────────────────────────────────────

async function getDb(): Promise<LanceConnection> {
  if (IS_FREE_TIER) {
    throw new Error('[VECTORSTORE] Modo FREE_TIER ativo - usando storage local JSON')
  }
  
  if (_db) return _db
  
  _db = await lancedb.connect({
    uri:    process.env.LANCEDB_URI!,
    apiKey: process.env.LANCEDB_API_KEY!,
    region: process.env.LANCEDB_REGION ?? 'us-east-1',
  })
  return _db
}

async function getTable(vectorDim?: number): Promise<LanceTable | null> {
  if (_table) return _table
  const db = await getDb()
  const names: string[] = await db.tableNames()

  if (names.includes(TABLE_NAME)) {
    _table = await db.openTable(TABLE_NAME)
    return _table
  }

  if (!vectorDim) return null

  // First write: create table with a sentinel row to establish schema
  const sentinel: Record<string, unknown> = {
    id: '__sentinel__', vector: new Array(vectorDim).fill(0) as number[],
    content: '', source: '', title: '', url: '__sentinel__',
    breadcrumb: '', page_type: '', crawled_at: '',
  }
  _table = await db.createTable(TABLE_NAME, [sentinel])
  // Remove the sentinel
  await _table.delete(`url = '__sentinel__'`)
  return _table
}

// ─── Row type ────────────────────────────────────────────────────────────────

interface LanceRow extends Record<string, unknown> {
  id: string
  vector: number[]
  content: string
  source: string
  title: string
  url: string
  breadcrumb: string
  page_type: string
  crawled_at: string
  _distance?: number
}

function buildRow(
  id: string,
  vector: number[],
  fields: Omit<LanceRow, 'id' | 'vector' | '_distance'>
): LanceRow {
  return { id, vector, ...fields } as LanceRow
}

function rowToChunk(row: LanceRow): DocChunk {
  return {
    id:        row.id,
    content:   row.content,
    embedding: row.vector,
    metadata:  {
      source:    row.source,
      title:     row.title,
      url:       row.url,
      breadcrumb: row.breadcrumb || undefined,
      pageType:  (row.page_type as DocChunk['metadata']['pageType']) || undefined,
      crawledAt: row.crawled_at  || undefined,
    },
  }
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
  if (doc.content.length < 120) {
    const hasStructure = /\d+/.test(doc.content) ||
      lowerContent.includes('é') || lowerContent.includes('copilot') ||
      lowerContent.includes('sentimento') || lowerContent.includes('agent') ||
      lowerContent.includes('export') || lowerContent.includes('function')
    if (!hasStructure) return true
  }
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
      
      // Count tokens in title and head
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
  const safe = text.slice(0, 2000)

  // Return cached embedding if available
  const cached = embeddingCache.get(safe)
  if (cached) {
    console.log('[EMBED] 💾 Cache hit')
    return cached
  }

  try {
    // Get API key for the provider - each provider uses only its own key
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
      default:
        throw new Error(`[EMBED] ❌ Provider desconhecido: ${provider}`)
    }

    if (!apiKey) {
      throw new Error(`[EMBED] ❌ Chave de API não encontrada para ${provider}. Configure a chave no .env.local ou nas configurações.`)
    }

    console.log(`[EMBED] 🔑 Usando chave de API do provider: ${provider}`)
    const result = await getEmbeddingForProvider(provider, safe, apiKey, onWarning)
    
    // Cache the result
    embeddingCache.set(safe, result.embedding)
    if (embeddingCache.size > 64) {
      const firstKey = embeddingCache.keys().next().value as string
      if (firstKey) embeddingCache.delete(firstKey)
    }
    
    return result.embedding
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[EMBED] ❌ Failed to get embedding: ${msg}`)
    embeddingsUnavailable = true
    throw err
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Limit concurrent embeddings to avoid rate limits
async function embedChunksWithConcurrencyControl(
  chunks: Omit<DocChunk, 'id' | 'embedding'>[],
  provider: EmbeddingProvider = 'gemini',
  onWarning?: (msg: string) => void
): Promise<{ embedding: number[]; chunk: Omit<DocChunk, 'id' | 'embedding'> }[]> {
  // Free tier: throughput conservador para evitar 429s
  // Paid tier: maior concorrência e menor delay
  const concurrencyLimit = IS_FREE_TIER
    ? (provider === 'gemini' ? 1 : provider === 'openai' ? 1 : 2)
    : (provider === 'gemini' ? 1 : provider === 'openai' ? 2 : 3)
  const delayMs = IS_FREE_TIER
    ? (provider === 'gemini' ? 700 : provider === 'openai' ? 500 : 300)
    : (provider === 'gemini' ? 500 : provider === 'openai' ? 300 : 200)
  const results: { embedding: number[]; chunk: Omit<DocChunk, 'id' | 'embedding'> }[] = []
  const queue = [...chunks]
  let inProgress = 0
  let completed = 0

  console.log(`[EMBED] 🔄 Starting to embed ${chunks.length} chunks with provider: ${provider} (concurrency: ${concurrencyLimit}, delay: ${delayMs}ms)`)

  const processChunk = async (chunk: Omit<DocChunk, 'id' | 'embedding'>, index: number) => {
    const titlePrefix = chunk.metadata.title ? `[${chunk.metadata.title}] ` : ''
    const enhancedContent = titlePrefix + chunk.content

    let embedding: number[] = []
    try {
      console.log(`[EMBED] 📍 Processing chunk ${index}/${chunks.length}`)
      embedding = await getEmbedding(enhancedContent, provider, onWarning)
      completed++
    } catch (err) {
      if (String((err as { message?: string })?.message ?? '') !== 'EMBEDDINGS_UNAVAILABLE') throw err
      embeddingsUnavailable = true
      completed++
    }
    return { embedding, chunk }
  }

  let chunkIndex = 0
  const worker = async () => {
    while (queue.length > 0) {
      const chunk = queue.shift()
      if (!chunk) break

      const index = chunkIndex++
      inProgress++
      try {
        const result = await processChunk(chunk, index)
        results.push(result)
      } finally {
        inProgress--
      }

      // Small delay between requests to ease rate limits
      if (queue.length > 0) {
        console.log(`[EMBED] ⏸️  Waiting ${delayMs}ms before next chunk (${completed}/${chunks.length} done)`)
        await new Promise(r => setTimeout(r, delayMs))
      }
    }
  }

  // Start workers
  const workers = Array(Math.min(concurrencyLimit, chunks.length))
    .fill(null)
    .map(() => worker())

  await Promise.all(workers)
  console.log(`[EMBED] ✅ Completed embedding all ${chunks.length} chunks`)
  return results
}

export async function addDocChunks(
  chunks: Omit<DocChunk, 'id' | 'embedding'>[],
  provider: EmbeddingProvider = 'gemini',
  onWarning?: (msg: string) => void
): Promise<void> {
  console.log(`[VECTORSTORE] 📥 Adicionando ${chunks.length} chunks (provider: ${provider}, mode: ${IS_FREE_TIER ? 'LOCAL JSON' : 'LanceDB'})`)

  const sourceUrl = chunks[0]?.metadata?.url
  const isSingleSource = !!sourceUrl && chunks.every(c => c.metadata?.url === sourceUrl)

  // Use concurrency-limited embedding
  const embeddedChunks = await embedChunksWithConcurrencyControl(chunks, provider, onWarning)

  if (embeddedChunks.length === 0) return

  // ─── FREE_TIER Mode: Use local JSON storage ─────────────────────────────────
  if (IS_FREE_TIER) {
    const store = await getLocalStore()
    
    // Remove old chunks from same source if single source
    if (isSingleSource) {
      store.chunks = store.chunks.filter(c => c.metadata.url !== sourceUrl)
      console.log(`[VECTORSTORE] 🗑️ Removidos chunks antigos de: ${sourceUrl}`)
    }

    // Add new chunks
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
    return
  }

  // ─── LanceDB Mode ────────────────────────────────────────────────────────────
  const rows: LanceRow[] = []

  for (const { embedding, chunk } of embeddedChunks) {
    rows.push(buildRow(crypto.randomUUID(), embedding, {
      content:    chunk.content,
      source:     chunk.metadata.source     ?? '',
      title:      chunk.metadata.title      ?? '',
      url:        chunk.metadata.url        ?? '',
      breadcrumb: chunk.metadata.breadcrumb ?? '',
      page_type:  chunk.metadata.pageType   ?? '',
      crawled_at: chunk.metadata.crawledAt  ?? '',
    }))
  }

  const vectorDim = rows[0].vector.length || 768
  const table = await getTable(vectorDim)
  if (!table) throw new Error('Não foi possível conectar ao LanceDB')

  // Upsert: remove stale rows for this URL, then insert fresh ones
  if (isSingleSource) {
    try {
      await table.delete(`url = '${sourceUrl.replace(/'/g, "''")}'`)
    } catch { /* table may be empty, ignore */ }
  } else {
    // Deduplicate by content across multi-source batch
    for (const row of rows) {
      try {
        await table.delete(`url = '${row.url.replace(/'/g, "''")}' AND content = '${row.content.slice(0, 80).replace(/'/g, "''")}'`)
      } catch { /* ignore */ }
    }
  }

  await table.add(rows)
}

export async function searchSimilarDocs(query: string, k = 5, provider: EmbeddingProvider = 'gemini'): Promise<DocChunk[]> {
  console.log(`[VECTORSTORE] 🔍 Buscando docs (query: "${query.substring(0, 50)}...", k: ${k}, mode: ${IS_FREE_TIER ? 'LOCAL JSON' : 'LanceDB'})`)

  // ─── FREE_TIER Mode: Use local JSON storage ─────────────────────────────────
  if (IS_FREE_TIER) {
    const store = await getLocalStore()
    if (store.chunks.length === 0) {
      console.log('[VECTORSTORE] ⚠️ Nenhum chunk encontrado no storage local')
      return []
    }

    const queryWords = query.trim().split(/\s+/).filter(Boolean).length
    const isShortQuery = queryWords <= 2
    const semanticWeight = isShortQuery ? 0.5 : 0.75
    const lexicalWeight  = isShortQuery ? 0.5 : 0.25

    try {
      const queryEmbedding = await getEmbedding(query, provider)
      
      const scored = filterDomainNoise(
        store.chunks.map(chunk => {
          const semanticScore = cosineSimilarity(queryEmbedding, chunk.embedding)
          const lexical = lexicalSimilarity(query, chunk.content)
          return {
            doc: chunk,
            score: semanticScore * semanticWeight + lexical * lexicalWeight,
          }
        }).sort((a, b) => b.score - a.score).slice(0, Math.max(k * 4, 16)),
        query
      )

      const relevant = scored.filter(s => s.score >= 0.08)
      return rerankDocs(relevant.length > 0 ? relevant : scored, query, k)
    } catch (err) {
      console.error('[VECTORSTORE] ❌ Erro na busca local:', err)
      // Fallback to lexical only
      const scored = filterDomainNoise(
        store.chunks.map(chunk => ({
          doc: chunk,
          score: lexicalSimilarity(query, chunk.content),
        })).sort((a, b) => b.score - a.score).slice(0, Math.max(k * 4, 16)),
        query
      )
      const relevant = scored.filter(s => s.score >= 0.03)
      return rerankDocs(relevant.length > 0 ? relevant : scored, query, k)
    }
  }

  // ─── LanceDB Mode ────────────────────────────────────────────────────────────
  const table = await getTable()
  if (!table) return []

  const CANDIDATES = Math.max(k * 4, 16)
  const queryWords = query.trim().split(/\s+/).filter(Boolean).length
  const isShortQuery = queryWords <= 2
  const semanticWeight = isShortQuery ? 0.5 : 0.75
  const lexicalWeight  = isShortQuery ? 0.5 : 0.25

  // Lexical-only fallback (no embeddings)
  if (embeddingsUnavailable) {
    const rows: LanceRow[] = await table.query().limit(CANDIDATES * 6).toArray()
    const scored = filterDomainNoise(
      rows.map(row => ({
        doc:   rowToChunk(row),
        score: lexicalSimilarity(query, row.content),
      })).sort((a, b) => b.score - a.score).slice(0, CANDIDATES),
      query
    )
    const relevant = scored.filter(s => s.score >= 0.03)
    return rerankDocs(relevant.length > 0 ? relevant : scored, query, k)
  }

  try {
    const queryEmbedding = await getEmbedding(query, provider)
    const rows: LanceRow[] = await table.search(queryEmbedding).limit(CANDIDATES).toArray()

    const scored = filterDomainNoise(
      rows.map(row => {
        // LanceDB returns _distance (L2); for normalized vectors: similarity ≈ 1 - distance
        const semanticScore = Math.max(0, 1 - (row._distance ?? 1))
        const lexical       = lexicalSimilarity(query, row.content)
        return {
          doc:   rowToChunk(row),
          score: semanticScore * semanticWeight + lexical * lexicalWeight,
        }
      }),
      query
    )

    const relevant = scored.filter(s => s.score >= 0.08)
    return rerankDocs(relevant.length > 0 ? relevant : scored, query, k)
  } catch {
    embeddingsUnavailable = true
    return searchSimilarDocs(query, k, provider) // recurse to lexical fallback
  }
}

export async function getStoreStats(): Promise<{ count: number; sources: string[] }> {
  // FREE_TIER Mode: Use local JSON storage
  if (IS_FREE_TIER) {
    const store = await getLocalStore()
    const sources = Array.from(new Set(store.chunks.map(c => c.metadata.source).filter(Boolean)))
    return { count: store.chunks.length, sources }
  }

  // LanceDB Mode
  const table = await getTable()
  if (!table) return { count: 0, sources: [] }

  try {
    const count: number = await table.countRows()
    const rows: Pick<LanceRow, 'source'>[] = await table.query().select(['source']).toArray()
    const sources = Array.from(new Set(rows.map(r => r.source).filter(Boolean)))
    return { count, sources }
  } catch {
    return { count: 0, sources: [] }
  }
}

export async function getIndexedSourceUrls(): Promise<string[]> {
  // FREE_TIER Mode: Use local JSON storage
  if (IS_FREE_TIER) {
    const store = await getLocalStore()
    return Array.from(new Set(store.chunks.map(c => c.metadata.url).filter(Boolean)))
  }

  // LanceDB Mode
  const table = await getTable()
  if (!table) return []
  try {
    const rows: Pick<LanceRow, 'url'>[] = await table.query().select(['url']).toArray()
    return Array.from(new Set(rows.map(r => r.url).filter(Boolean)))
  } catch { return [] }
}

export async function getIndexedUrlsWithDates(): Promise<Map<string, string>> {
  const table = await getTable()
  if (!table) return new Map()
  try {
    const rows: Pick<LanceRow, 'url' | 'crawled_at'>[] =
      await table.query().select(['url', 'crawled_at']).toArray()
    const result = new Map<string, string>()
    for (const row of rows) {
      if (row.url && row.crawled_at && !result.has(row.url)) {
        result.set(row.url, row.crawled_at)
      }
    }
    return result
  } catch { return new Map() }
}

export function isUrlStale(crawledAt: string | undefined, maxAgeDays = 14): boolean {
  if (!crawledAt) return true
  const ts = Date.parse(crawledAt)
  if (Number.isNaN(ts)) return true
  return (Date.now() - ts) / 86_400_000 > maxAgeDays
}

export async function clearStore(): Promise<void> {
  const db = await getDb()
  try {
    await db.dropTable(TABLE_NAME)
  } catch { /* already gone */ }
  _table = null
}
