import { type Provider } from '@/core/providers';
import { type Conversation, type Message as MessageType, type Source } from '@/shared/types';
import { type ApiKeyMap } from '@/shared/utils/api-key-storage';

export type { Conversation, MessageType, Provider, Source };

export interface ChatViewProps {
  conversationId: string | null;
  onConversationSaved: (conv: Conversation) => void;
}

export interface SendChatMessageParams {
  messages: MessageType[];
  userName?: string;
  provider: Provider;
  apiKeys?: ApiKeyMap;
  signal: AbortSignal;
}

export interface ChatResult {
  content: string;
  sources?: Source[];
}
