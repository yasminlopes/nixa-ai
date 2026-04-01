import { EmbeddingResult } from './types'

// Groq doesn't offer embeddings API
export async function getGroqEmbedding(
  text: string,
  apiKey: string,
  onWarning?: (msg: string) => void
): Promise<EmbeddingResult> {
  const errorMsg = '❌ Groq não oferece API de embeddings própria. Por favor, use outro provider (Gemini, OpenAI ou Hugging Face) para embeddings.'
  console.error(`[EMBED] ${errorMsg}`)
  throw new Error(errorMsg)
}
