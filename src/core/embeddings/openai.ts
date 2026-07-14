import { EmbeddingResult } from './types'

function isRateLimitError(error: unknown): boolean {
  const status = (error as { status?: number })?.status
  const message = String((error as { message?: string })?.message ?? '')
  return status === 429 || message.includes('quota') || message.includes('rate_limit_exceeded')
}

function parseRetryDelay(error: unknown, attempt: number, headers?: Headers): number {
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

  const exponentialDelay = (attempt + 1) * 30_000
  return Math.min(exponentialDelay, 90_000)
}

// Modelo fixo. Trocar o default exige re-indexar (dimensões diferentes) — por
// isso não é mais um toggle de ambiente. Override pontual via env se precisar.
const DEFAULT_OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small'

export async function getOpenAIEmbedding(
  text: string,
  apiKey: string,
  onWarning?: (msg: string) => void
): Promise<EmbeddingResult> {
  const safe = text.slice(0, 2000)
  const model = process.env.OPENAI_EMBEDDING_MODEL ?? DEFAULT_OPENAI_EMBEDDING_MODEL

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
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

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } }
        const errMsg = data.error?.message ?? `OpenAI embedding failed (${response.status})`

        if (response.status === 429 || isRateLimitError(data.error)) {
          const wait = parseRetryDelay(data.error, attempt, response.headers)
          if (onWarning) onWarning(`OpenAI rate limit. Aguardando ${Math.round(wait / 1000)}s... (tentativa ${attempt + 1}/3)`)
          await new Promise(resolve => setTimeout(resolve, wait))
          continue
        }

        throw new Error(errMsg)
      }

      const data = (await response.json()) as { data?: Array<{ embedding?: number[] }> }
      const embedding = data.data?.[0]?.embedding

      if (!embedding || embedding.length === 0) {
        throw new Error('No embedding returned from OpenAI')
      }

      return { embedding, model, cached: false }
    } catch (error) {
      if (attempt === 2) throw error
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  throw new Error('OpenAI embedding failed after 3 attempts')
}
