import { type RefObject } from 'react'
import { Database } from 'lucide-react'
import { type MessageType } from '../../types'
import { ChatMessage } from '../chat-message'
import { EmptyState } from '../empty-state'
import styles from './chat-list.module.scss'

interface ChatListProps {
  messages: MessageType[]
  isStreaming: boolean
  docsCount: number | null
  onSuggest: (q: string) => void
  bottomRef: RefObject<HTMLDivElement | null>
}

export function ChatList({ messages, isStreaming, docsCount, onSuggest, bottomRef }: ChatListProps) {
  return (
    <>
      {docsCount === 0 && (
        <div className={styles.bannerWarning}>
          <Database size={12} style={{ flexShrink: 0 }} />
          <span>
            Base sem documentação indexada.{' '}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('nixa-open-workspace', { detail: { tab: 'index' } }))}
              className={styles.bannerLink}
            >
              Indexar agora
            </button>
          </span>
        </div>
      )}
      {docsCount != null && docsCount > 0 && (
        <div className={styles.bannerInfo}>
          <Database size={10} />
          {docsCount.toLocaleString('pt-BR')} chunks · base ativa
        </div>
      )}

      <div className={styles.scrollArea}>
        {messages.length === 0 ? (
          <EmptyState onSuggest={onSuggest} />
        ) : (
          <div className={styles.messagesInner}>
            {messages.map((msg, i) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isStreaming={isStreaming && i === messages.length - 1}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </>
  )
}
