import { HfInference } from '@huggingface/inference'
import { EmbeddingResult } from './types'

const IS_FREE_TIER = process.env.FREE_TIER === 'true'

// Free tier: all-MiniLM-L6-v2 (384 dims, leve e rápido)
// Paid tier: BAAI/bge-large-en-v1.5 (1024 dims, maior qualidade)
// Override via HUGGINGFACE_EMBEDDING_MODEL env var
// AVISO: trocar entre tiers exige re-indexação (dimensões diferentes)
const DEFAULT_EMBEDDING_MODEL = IS_FREE_TIER
  ? 'sentence-transformers/all-MiniLM-L6-v2'
  : 'BAAI/bge-large-en-v1.5'

export async function getHuggingFaceEmbedding(
  text: string,
  apiKey: string,
  onWarning?: (msg: string) => void
): Promise<EmbeddingResult> {
  const safe = text.slice(0, 2000)
  const hf = new HfInference(apiKey)
  const model = process.env.HUGGINGFACE_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL

  try {
    console.log(`[EMBED] 🔄 Hugging Face embedding with model ${model}`)
    const result = await hf.featureExtraction({
      model,
      inputs: safe,
    })

    let embedding: number[]
    
    if (Array.isArray(result)) {
      if (Array.isArray(result[0])) {
        embedding = result[0] as number[]
      } else {
        embedding = result as number[]
      }
    } else {
      throw new Error('Unexpected embedding format from Hugging Face')
    }

    console.log(`[EMBED] ✅ Hugging Face embedding successful (${embedding.length} dimensions)`)
    return { embedding, model, cached: false }
  } catch (err) {
    const errorDetails = {
      status: (err as { status?: number })?.status,
      message: (err as { message?: string })?.message,
      error: err,
    }
    console.error(`[EMBED] 📊 Hugging Face error details:`, JSON.stringify(errorDetails, null, 2))
    throw err
  }
}
