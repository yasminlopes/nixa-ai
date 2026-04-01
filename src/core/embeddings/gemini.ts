import { GoogleGenerativeAI } from '@google/generative-ai'
import { EmbeddingResult } from './types'

const IS_FREE_TIER = process.env.FREE_TIER === 'true'

// Free tier: text-embedding-004 primeiro (768 dims, quota mais estável)
// Paid tier: gemini-embedding-001 primeiro (3072 dims, maior qualidade)
// AVISO: trocar entre tiers exige re-indexação (dimensões diferentes)
const EMBEDDING_CANDIDATE_MODELS = [
  process.env.GEMINI_EMBEDDING_MODEL,
  ...(IS_FREE_TIER
    ? ['text-embedding-004', 'gemini-embedding-001']
    : ['gemini-embedding-001', 'text-embedding-004']),
  'embedding-001',
].filter(Boolean) as string[]

function isEmbeddingUnavailableError(error: unknown): boolean {
  const status = (error as { status?: number })?.status
  const message = String((error as { message?: string })?.message ?? '')
  return (
    status === 404 ||
    message.includes('not supported for embedContent') ||
    message.includes('is not found for API version')
  )
}

function isRateLimitError(error: unknown): boolean {
  const status = (error as { status?: number })?.status
  const message = String((error as { message?: string })?.message ?? '')
  return status === 429 || message.includes('429') || message.includes('Too Many Requests') || message.includes('quota')
}

function parseRetryDelay(error: unknown, attempt: number): number {
  const message = String((error as { message?: string })?.message ?? '')
  const match = message.match(/retry[^\d]*(\d+(?:\.\d+)?)\s*s/i)
  
  // If server says wait X seconds, use that
  if (match) {
    const serverDelay = Math.ceil(parseFloat(match[1])) * 1000
    return serverDelay
  }
  
  // Otherwise use exponential backoff: 60s, 90s, 120s for attempts 1, 2, 3
  const exponentialDelay = (attempt + 1) * 30_000
  return Math.min(exponentialDelay, 120_000)
}

export async function getGeminiEmbedding(
  text: string,
  apiKey: string,
  onWarning?: (msg: string) => void
): Promise<EmbeddingResult> {
  const safe = text.slice(0, 2000)
  const genAI = new GoogleGenerativeAI(apiKey)
  let lastErr: unknown

  for (const model of EMBEDDING_CANDIDATE_MODELS) {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        console.log(`[EMBED] 🔄 Gemini attempt ${attempt + 1}/4 with model ${model}`)
        const m = genAI.getGenerativeModel({ model })
        const r = await m.embedContent(safe)
        console.log(`[EMBED] ✅ Gemini embedding successful (${r.embedding.values.length} dimensions)`)
        return { embedding: r.embedding.values, model, cached: false }
      } catch (err) {
        lastErr = err

        if (isRateLimitError(err)) {
          const wait = parseRetryDelay(err, attempt)
          const errorDetails = {
            status: (err as { status?: number })?.status,
            message: (err as { message?: string })?.message,
            error: err,
          }
          console.error(`[EMBED] 📊 Rate limit error details:`, JSON.stringify(errorDetails, null, 2))
          const msg = `⚠️ Gemini rate limit (429). Aguardando ${Math.round(wait / 1000)}s... (attempt ${attempt + 1}/4)`
          console.warn(`[EMBED] ${msg}`)
          if (onWarning) onWarning(msg)
          await new Promise(r => setTimeout(r, wait))
          continue
        }

        if (!isEmbeddingUnavailableError(err)) {
          const errorDetails = {
            status: (err as { status?: number })?.status,
            message: (err as { message?: string })?.message,
            error: err,
          }
          console.error(`[EMBED] 📊 Gemini error details (model ${model}):`, JSON.stringify(errorDetails, null, 2))
          throw err
        }

        const msg = `Modelo de embedding Gemini "${model}" indisponível. Tentando próximo...`
        console.warn(`[EMBED] ⚠️ ${msg}`)
        if (onWarning) onWarning(`⚠️ ${msg}`)
        break
      }
    }
  }

  console.error('[EMBED] ❌ Gemini embeddings unavailable after all retries')
  throw lastErr ?? new Error('GEMINI_EMBEDDINGS_UNAVAILABLE')
}
