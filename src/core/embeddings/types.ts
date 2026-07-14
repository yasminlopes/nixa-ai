export type EmbeddingProvider = 'gemini' | 'openai' | 'ollama'

export interface EmbeddingResult {
  embedding: number[]
  model: string
  cached?: boolean
}
