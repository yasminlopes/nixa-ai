import { EmbeddingProvider, EmbeddingResult } from './types'
import { getOpenAIEmbedding } from './openai'
import { getGeminiEmbedding } from './gemini'
import { getOllamaEmbedding } from './ollama'

export async function getEmbeddingForProvider(
  provider: EmbeddingProvider,
  text: string,
  apiKey: string,
  onWarning?: (msg: string) => void
): Promise<EmbeddingResult> {
  switch (provider) {
    case 'openai':
      return getOpenAIEmbedding(text, apiKey, onWarning)
    case 'gemini':
      return getGeminiEmbedding(text, apiKey, onWarning)
    case 'ollama':
      return getOllamaEmbedding(text, apiKey, onWarning)
    default:
      throw new Error(`Unknown embedding provider: ${provider}`)
  }
}

export type { EmbeddingProvider, EmbeddingResult }
