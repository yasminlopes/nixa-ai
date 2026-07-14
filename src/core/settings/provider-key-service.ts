import { type Provider } from '@/core/providers'
import { getDecryptedApiKey } from './settings-store'

export class MissingApiKeyError extends Error {
  provider: Provider

  constructor(provider: Provider) {
    super(`Chave da LLM (${provider}) não configurada.`)
    this.name = 'MissingApiKeyError'
    this.provider = provider
  }
}

const ENV_FALLBACK: Partial<Record<Provider, string | undefined>> = {
  gemini: process.env.GEMINI_API_KEY,
  openai: process.env.OPENAI_API_KEY,
}

/**
 * Única porta de entrada pra obter a API key de um provider. Nenhuma rota ou
 * provider de LLM/embeddings precisa saber se a chave veio do storage
 * criptografado ou de uma env var de fallback do servidor — só chamam isto.
 */
export async function resolveProviderApiKey(provider: Provider): Promise<string> {
  if (provider === 'ollama') return ''

  const stored = await getDecryptedApiKey(provider)
  if (stored) return stored

  const fallback = ENV_FALLBACK[provider]
  if (fallback) return fallback

  throw new MissingApiKeyError(provider)
}
