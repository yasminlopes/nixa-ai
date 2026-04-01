import { EmbeddingProvider, EmbeddingResult } from './types'
import { getOpenAIEmbedding } from './openai'
import { getAnthropicEmbedding } from './anthropic'
import { getGroqEmbedding } from './groq'
import { getGeminiEmbedding } from './gemini'
import { getHuggingFaceEmbedding } from './huggingface'

export async function getEmbeddingForProvider(
  provider: EmbeddingProvider,
  text: string,
  apiKey: string,
  onWarning?: (msg: string) => void
): Promise<EmbeddingResult> {
  console.log(`[EMBED] 🚀 Getting embedding for provider: ${provider}`)

  switch (provider) {
    case 'openai':
      return getOpenAIEmbedding(text, apiKey, onWarning)
    case 'anthropic':
      return getAnthropicEmbedding(text, apiKey, onWarning)
    case 'groq':
      return getGroqEmbedding(text, apiKey, onWarning)
    case 'gemini':
      return getGeminiEmbedding(text, apiKey, onWarning)
    case 'huggingface':
      return getHuggingFaceEmbedding(text, apiKey, onWarning)
    default:
      throw new Error(`Unknown embedding provider: ${provider}`)
  }
}

export type { EmbeddingProvider, EmbeddingResult }
