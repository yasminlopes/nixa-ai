import { EmbeddingResult } from './types'

const DEFAULT_BASE_URL = 'http://localhost:11434'
const DEFAULT_MODEL = 'all-minilm'

// Limite de caracteres por modelo (aproximado, conservador).
// Cada modelo tem uma janela de contexto diferente em tokens.
const MODEL_CHAR_LIMITS: Record<string, number> = {
  'all-minilm':         700,   // 256 tokens
  'all-minilm:latest':  700,
  'nomic-embed-text':   6000,  // 8192 tokens
  'mxbai-embed-large':  1400,  // 512 tokens
  'snowflake-arctic-embed': 1400,
  'bge-large':          1400,
  'bge-base':           1400,
}

function getBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
}

function getModel(): string {
  return process.env.OLLAMA_EMBEDDING_MODEL ?? DEFAULT_MODEL
}

function getCharLimit(model: string): number {
  // Normaliza removendo :tag se houver e tenta lookup
  const base = model.split(':')[0]
  return MODEL_CHAR_LIMITS[model] ?? MODEL_CHAR_LIMITS[base] ?? 1200
}

interface OllamaEmbedResponse {
  embedding?: number[]
  embeddings?: number[][]
  error?: string
}

export async function getOllamaEmbedding(
  text: string,
  _apiKey: string,
  onWarning?: (msg: string) => void
): Promise<EmbeddingResult> {
  const baseUrl = getBaseUrl()
  const model = getModel()
  const charLimit = getCharLimit(model)

  // Trunca pelo limite do modelo (conservador pra evitar "input exceeds context")
  let safe = text.slice(0, charLimit)

  console.log(`[EMBED] 🦙 Ollama -> ${baseUrl} (model: ${model}, chars: ${safe.length}/${charLimit})`)

  // Faz até 2 tentativas com truncamento progressivo se der erro de contexto
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: safe }),
        signal: AbortSignal.timeout(30000),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        // Se for erro de contexto, trunca pela metade e tenta de novo
        if (body.includes('context length') || body.includes('exceeds')) {
          if (attempt === 0) {
            const half = Math.floor(safe.length / 2)
            console.warn(`[EMBED] ⚠️ Contexto excedido, truncando para ${half} chars`)
            safe = safe.slice(0, half)
            continue
          }
        }
        throw new Error(`Ollama embeddings failed (${res.status}): ${body.slice(0, 200)}`)
      }

      const data = (await res.json()) as OllamaEmbedResponse
      const embedding = data.embedding ?? data.embeddings?.[0]

      if (!embedding || embedding.length === 0) {
        throw new Error(`Ollama returned empty embedding (${data.error ?? 'unknown'})`)
      }

      console.log(`[EMBED] ✅ Ollama embedding ok (${embedding.length} dims)`)
      return { embedding, model, cached: false }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
        const hint = `⚠️ Ollama não responde em ${baseUrl}. Rode "ollama serve" e "ollama pull ${model}".`
        console.error(`[EMBED] ❌ ${hint}`)
        if (onWarning) onWarning(hint)
      }
      if (attempt === 1) throw err
      // Última chance: se for contexto, trunca pela metade
      if (msg.includes('context length') || msg.includes('exceeds')) {
        const half = Math.floor(safe.length / 2)
        console.warn(`[EMBED] ⚠️ Retry com ${half} chars`)
        safe = safe.slice(0, half)
        continue
      }
      throw err
    }
  }

  throw new Error('Ollama embedding falhou após retries')
}
