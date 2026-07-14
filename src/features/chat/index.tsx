'use client'

import { useChat } from './hooks/use-chat'
import { ChatList } from './components/chat-list'
import { ChatInput } from './components/chat-input'
import { type ChatViewProps } from './types'
import styles from './index.module.scss'

export function ChatInterface(props: ChatViewProps) {
  const {
    messages,
    input,
    setInput,
    isLoading,
    isStreaming,
    docsCount,
    provider,
    hasKeys,
    bottomRef,
    handleSubmit,
    handleStop,
    handleProviderChange,
  } = useChat(props)

  return (
    <div className={styles.wrapper}>
      <ChatList
        messages={messages}
        isStreaming={isStreaming}
        docsCount={docsCount}
        onSuggest={q => handleSubmit(q)}
        bottomRef={bottomRef}
      />

      <div className={styles.inputArea}>
        <div className={styles.inputAreaInner}>
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={() => handleSubmit()}
            onStop={handleStop}
            isLoading={isLoading}
            provider={provider}
            onProviderChange={handleProviderChange}
            hasKeys={hasKeys}
          />
        </div>
      </div>
    </div>
  )
}
