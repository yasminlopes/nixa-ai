import { useEffect, useRef, useState } from 'react'
import { getStoredProvider, saveStoredProvider } from '@/shared/utils/llm-settings-storage'
import { getApiKeyMap, getKeyStatus } from '@/shared/utils/api-key-storage'
import { sendChatMessage } from '../services/chat-service'
import { type ChatViewProps, type Conversation, type MessageType, type Provider } from '../types'

export function useChat({ conversationId, onConversationSaved }: ChatViewProps) {
  const [messages, setMessages] = useState<MessageType[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [docsCount, setDocsCount] = useState<number | null>(null)
  const [provider, setProvider] = useState<Provider>(() => getStoredProvider() ?? 'gemini')
  const [hasKeys, setHasKeys] = useState<Partial<Record<Provider, boolean>>>({})
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!conversationId) { setMessages([]); return }
    try {
      const stored = localStorage.getItem('nixa-conversations')
      if (stored) {
        const convs: Conversation[] = JSON.parse(stored)
        const conversation = convs.find(item => item.id === conversationId)
        if (conversation) setMessages(conversation.messages)
      }
    } catch { }
  }, [conversationId])

  useEffect(() => {
    fetch('/api/index-docs')
      .then(response => response.json())
      .then((data: { count: number }) => setDocsCount(data.count))
      .catch(() => setDocsCount(0))
  }, [])

  useEffect(() => {
    setProvider(getStoredProvider() ?? 'gemini')
    setHasKeys(getKeyStatus())
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function saveConversation(msgs: MessageType[]) {
    const title = msgs.find(message => message.role === 'user')?.content.slice(0, 60) ?? 'Nova conversa'
    const stored = localStorage.getItem('nixa-conversations')
    const convs: Conversation[] = stored ? JSON.parse(stored) : []
    const existing = convs.find(conversation => conversation.id === (conversationId ?? ''))
    const now = new Date()
    let updated: Conversation[], savedConv: Conversation
    if (existing) {
      savedConv = { ...existing, messages: msgs, updatedAt: now }
      updated = convs.map(conversation => (conversation.id === savedConv.id ? savedConv : conversation))
    } else {
      savedConv = { id: crypto.randomUUID(), title, messages: msgs, createdAt: now, updatedAt: now }
      updated = [savedConv, ...convs]
    }
    localStorage.setItem('nixa-conversations', JSON.stringify(updated))
    onConversationSaved(savedConv)
  }

  async function handleSubmit(text?: string) {
    const content = (text ?? input).trim()
    if (!content || isLoading) return
    setInput('')

    const userMsg: MessageType = { id: crypto.randomUUID(), role: 'user', content, createdAt: new Date() }
    const aiMsg: MessageType = { id: crypto.randomUUID(), role: 'assistant', content: '', createdAt: new Date() }
    const newMessages = [...messages, userMsg, aiMsg]
    setMessages(newMessages)
    setIsLoading(true)
    abortRef.current = new AbortController()

    try {
      const stream = sendChatMessage({
        messages: [...messages, userMsg],
        userName: localStorage.getItem('nixa-user-name') ?? undefined,
        provider,
        apiKeys: getApiKeyMap(),
        signal: abortRef.current.signal,
      })

      let finalMessages = newMessages
      for await (const chunk of stream) {
        finalMessages = newMessages.map(message =>
          message.id === aiMsg.id ? { ...message, content: chunk.content, sources: chunk.sources } : message
        )
        setMessages(finalMessages)
      }
      saveConversation(finalMessages)
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        setMessages(prev => prev.map(message =>
          message.id === aiMsg.id ? { ...message, content: message.content || '__interrupted__' } : message
        ))
      } else {
        setMessages(prev => prev.map(message =>
          message.id === aiMsg.id
            ? { ...message, content: `❌ Erro ao gerar resposta. Detalhe: ${error instanceof Error ? error.message : String(error)}` }
            : message
        ))
      }
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }

  function handleStop() {
    abortRef.current?.abort()
    setIsLoading(false)
  }

  function handleProviderChange(nextProvider: Provider) {
    setProvider(nextProvider)
    saveStoredProvider(nextProvider)
  }

  const isStreaming = isLoading && messages[messages.length - 1]?.role === 'assistant'

  return {
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
  }
}
