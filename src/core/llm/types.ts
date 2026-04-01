import { Message } from '@/shared/types'

export interface LLMParams {
  apiKey: string
  systemPrompt: string
  history: Message[]
  userMessage: string
}

export interface LLMConfig {
  model: string
  temperature: number
  maxTokens: number
}
