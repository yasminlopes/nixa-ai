import { EmbeddingProvider, EmbeddingResult } from './types'
import { getOpenAIEmbedding } from './openai'
import { getGeminiEmbedding } from './gemini'
import { getOllamaEmbedding } from './ollama'

// Versão do schema do índice de embeddings. Suba quando algo que invalida os
// vetores existentes mudar (modelo default, pré-processamento, etc.).
export const EMBEDDING_SCHEMA_VERSION = 1

/**
 * Provider de embedding da Nixa — FIXO, independente do LLM de chat escolhido.
 * Indexação e busca DEVEM usar o mesmo, senão os vetores vivem em espaços
 * diferentes e a similaridade vira ruído. Configurável via env; default gemini
 * (o histórico do índice). Trocar exige re-indexar.
 */
export function getIndexingEmbeddingProvider(): EmbeddingProvider {
  const configuredProvider = process.env.NIXA_EMBEDDING_PROVIDER
  if (configuredProvider === 'gemini' || configuredProvider === 'openai' || configuredProvider === 'ollama') return configuredProvider
  return 'gemini'
}

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
