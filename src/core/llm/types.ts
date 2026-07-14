import { Message } from '@/shared/types'

export interface LLMParams {
  apiKey: string
  systemPrompt: string
  history: Message[]
  userMessage: string
}
