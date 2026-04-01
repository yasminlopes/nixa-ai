import { EmbeddingResult } from './types'

// Anthropic doesn't offer embeddings API
export async function getAnthropicEmbedding(
  text: string,
  apiKey: string,
  onWarning?: (msg: string) => void
): Promise<EmbeddingResult> {
  const errorMsg = '❌ Anthropic não oferece API de embeddings própria. Por favor, use outro provider (Gemini, OpenAI ou Hugging Face) para embeddings.'
  console.error(`[EMBED] ${errorMsg}`)
  throw new Error(errorMsg)
}
