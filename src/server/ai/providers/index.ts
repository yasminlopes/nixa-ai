import { type Provider } from '@/core/providers'
import { LLMParams, GenerateResult } from './types'
import { runGeminiChat } from './gemini.provider'
import { runOpenAIChat } from './openai.provider'
import { runOllamaChat } from './ollama.provider'

export { extractRetryDelaySeconds } from './gemini.provider'
export type { LLMParams, GenerateResult } from './types'

/**
 * Dispara a geração no provider escolhido e devolve sempre a mesma forma
 * (`GenerateResult`). Providers que só expõem um `AsyncIterable<string>` são
 * embrulhados aqui; o Gemini já devolve `{ stream, rateLimitError }` nativo.
 *
 * Pode lançar (ex.: Gemini que abre o stream de forma eager) — quem orquestra
 * decide o que fazer. Para OpenAI/Ollama o fetch só roda quando o stream é
 * consumido, então erros aparecem durante a iteração, não nesta chamada.
 */
export function generate(provider: Provider, params: LLMParams): Promise<GenerateResult> {
  switch (provider) {
    case 'gemini':
      return runGeminiChat(params)
    case 'openai':
      return Promise.resolve({ stream: runOpenAIChat(params) })
    case 'ollama':
      return Promise.resolve({ stream: runOllamaChat(params) })
    default: {
      const _exhaustive: never = provider
      throw new Error(`Provider de LLM não suportado: ${_exhaustive}`)
    }
  }
}
