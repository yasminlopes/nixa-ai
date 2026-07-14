import { type Message as MessageType, type Conversation, type Source } from '@/shared/types'
import { type Provider } from '@/core/providers'
import { type ApiKeyMap } from '@/shared/utils/api-key-storage'

export type { MessageType, Conversation, Source, Provider }

export interface ChatViewProps {
  conversationId: string | null
  onConversationSaved: (conv: Conversation) => void
}

export interface SendChatMessageParams {
  messages: MessageType[]
  userName?: string
  provider: Provider
  apiKeys?: ApiKeyMap
  signal: AbortSignal
}

export interface ChatResult {
  content: string
  sources?: Source[]
}
