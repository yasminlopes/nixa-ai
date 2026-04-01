import { EmbeddingResult } from './types'

function isRateLimitError(error: unknown): boolean {
  const status = (error as { status?: number })?.status
  const message = String((error as { message?: string })?.message ?? '')
  return status === 429 || message.includes('quota') || message.includes('rate_limit_exceeded')
}

function parseRetryDelay(error: unknown, attempt: number, headers?: Headers): number {
  // Check retry-after header first
  if (headers) {
    const retryAfter = headers.get('retry-after')
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10)
      if (!isNaN(seconds)) return seconds * 1000
    }
  }

  const message = String((error as { message?: string })?.message ?? '')
  const match = message.match(/retry[^\d]*(\d+(?:\.\d+)?)\s*s/i)
  if (match) {
    return Math.ceil(parseFloat(match[1])) * 1000
  }

  // Exponential backoff: 30s, 60s, 90s for attempts 0, 1, 2
  const exponentialDelay = (attempt + 1) * 30_000
  return Math.min(exponentialDelay, 90_000)
}

const IS_FREE_TIER = process.env.FREE_TIER === 'true'

// Free tier: text-embedding-3-small (1536 dims, mais barato)
// Paid tier: text-embedding-3-large (3072 dims, maior qualidade)
// Override via OPENAI_EMBEDDING_MODEL env var
// AVISO: trocar entre tiers exige re-indexação (dimensões diferentes)
const DEFAULT_OPENAI_EMBEDDING_MODEL = IS_FREE_TIER ? 'text-embedding-3-small' : 'text-embedding-3-large'

export async function getOpenAIEmbedding(
  text: string,
  apiKey: string,
  onWarning?: (msg: string) => void
): Promise<EmbeddingResult> {
  const safe = text.slice(0, 2000)
  const model = process.env.OPENAI_EMBEDDING_MODEL ?? DEFAULT_OPENAI_EMBEDDING_MODEL

  console.log(`[EMBED] 🔄 OpenAI: creating embedding with ${model} (${IS_FREE_TIER ? 'free' : 'paid'} tier)`)

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: safe,
          encoding_format: 'float',
        }),
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
        const errMsg = data.error?.message ?? `OpenAI embedding failed (${res.status})`
        
        // Log rate limit details
        if (res.status === 429 || isRateLimitError(data.error)) {
          const rateLimitDetails = {
            status: res.status,
            headers: {
              'retry-after': res.headers.get('retry-after'),
              'x-ratelimit-limit-requests': res.headers.get('x-ratelimit-limit-requests'),
              'x-ratelimit-remaining-requests': res.headers.get('x-ratelimit-remaining-requests'),
              'x-ratelimit-reset-requests': res.headers.get('x-ratelimit-reset-requests'),
              'x-ratelimit-limit-tokens': res.headers.get('x-ratelimit-limit-tokens'),
              'x-ratelimit-remaining-tokens': res.headers.get('x-ratelimit-remaining-tokens'),
            },
            errorMessage: errMsg,
          }
          console.error(`[EMBED] 📊 OpenAI rate limit details:`, JSON.stringify(rateLimitDetails, null, 2))
          
          const wait = parseRetryDelay(data.error, attempt, res.headers)
          const msg = `⚠️ OpenAI rate limit. Aguardando ${Math.round(wait / 1000)}s... (attempt ${attempt + 1}/3)`
          console.warn(`[EMBED] ${msg}`)
          if (onWarning) onWarning(msg)
          await new Promise(r => setTimeout(r, wait))
          continue
        }

        console.error(`[EMBED] ❌ OpenAI error (${res.status}):`, errMsg)
        throw new Error(errMsg)
      }

      const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> }
      const embedding = data.data?.[0]?.embedding

      if (!embedding || embedding.length === 0) {
        throw new Error('No embedding returned from OpenAI')
      }

      console.log(`[EMBED] ✅ OpenAI embedding successful (${embedding.length} dimensions)`)
      return { embedding, model, cached: false }
    } catch (err) {
      if (attempt === 2) throw err
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[EMBED] ⚠️ Attempt ${attempt + 1} failed: ${msg}`)
      await new Promise(r => setTimeout(r, 500))
    }
  }

  throw new Error('OpenAI embedding failed after 3 attempts')
}
