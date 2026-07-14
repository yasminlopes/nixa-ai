import { Message } from '@/shared/types';

export interface LLMParams {
  apiKey: string;
  systemPrompt: string;
  history: Message[];
  userMessage: string;
}

/**
 * Resultado normalizado de qualquer provider de LLM.
 * A orquestração (ai.service) só conhece esta forma — nunca o SDK por baixo.
 * `rateLimitError` fica preenchido quando o provider bateu quota/rate limit
 * antes de conseguir abrir o stream (o `stream` vem vazio nesse caso).
 */
export interface GenerateResult {
  stream: AsyncIterable<string>;
  rateLimitError?: unknown;
}
