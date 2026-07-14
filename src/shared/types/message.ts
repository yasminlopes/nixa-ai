import type { Source } from './source'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  createdAt: Date
}
