export type EmbeddingProvider = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'huggingface'

export interface EmbeddingResult {
  embedding: number[]
  model: string
  cached?: boolean
}

export interface EmbeddingFunctions {
  getEmbedding: (
    text: string,
    apiKey: string,
    onWarning?: (msg: string) => void
  ) => Promise<EmbeddingResult>
}
