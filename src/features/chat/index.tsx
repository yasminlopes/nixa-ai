'use client'

import { useEffect, useRef, useState } from 'react'
import { Database } from 'lucide-react'
import { Message as MessageType, Conversation, Source } from '@/shared/types'
import { type Provider } from '@/core/providers'
import { getStoredSettings, saveStoredSettings, getApiKey, hasKey } from '@/shared/utils/llm-settings-storage'
import { Message } from './components/message'
import { MessageInput } from './components/message-input'
import { EmptyState } from './components/empty-state'

interface ChatInterfaceProps {
  conversationId: string | null
  onConversationSaved: (conv: Conversation) => void
}

export function ChatInterface({ conversationId, onConversationSaved }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<MessageType[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [docsCount, setDocsCount] = useState<number | null>(null)
  const [provider, setProvider] = useState<Provider>('gemini')
  const [hasKeys, setHasKeys] = useState<Partial<Record<Provider, boolean>>>({})
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!conversationId) { setMessages([]); return }
    try {
      const stored = localStorage.getItem('nixa-conversations')
      if (stored) {
        const convs: Conversation[] = JSON.parse(stored)
        const conv = convs.find(c => c.id === conversationId)
        if (conv) setMessages(conv.messages)
      }
    } catch { /* ignore */ }
  }, [conversationId])

  useEffect(() => {
    fetch('/api/index-docs')
      .then(r => r.json())
      .then((d: { count: number }) => setDocsCount(d.count))
      .catch(() => setDocsCount(0))
  }, [])

  useEffect(() => {
    const stored = getStoredSettings()
    setProvider(stored.defaultProvider)
    setHasKeys({
      gemini: hasKey('gemini'),
      openai: hasKey('openai'),
      ollama: true,
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function saveConversation(msgs: MessageType[]) {
    const title = msgs.find(m => m.role === 'user')?.content.slice(0, 60) ?? 'Nova conversa'
    const stored = localStorage.getItem('nixa-conversations')
    const convs: Conversation[] = stored ? JSON.parse(stored) : []
    const existing = convs.find(c => c.id === (conversationId ?? ''))
    const now = new Date()
    let updated: Conversation[], savedConv: Conversation
    if (existing) {
      savedConv = { ...existing, messages: msgs, updatedAt: now }
      updated = convs.map(c => (c.id === savedConv.id ? savedConv : c))
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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          userName: localStorage.getItem('nixa-user-name') ?? undefined,
          provider,
          apiKey: getApiKey(provider),
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error('Falha ao chamar a API')

      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        const payload = (await res.json()) as { message?: string; sources?: Source[] }
        const finalMessages = newMessages.map(m =>
          m.id === aiMsg.id ? { ...m, content: payload.message ?? 'Sem resposta no momento.', sources: payload.sources } : m
        )
        setMessages(finalMessages)
        saveConversation(finalMessages)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        const sourcesIdx = accumulated.indexOf('\n\n__SOURCES__')
        let displayText = accumulated
        let sources: Source[] | undefined
        if (sourcesIdx !== -1) {
          displayText = accumulated.slice(0, sourcesIdx)
          try { sources = JSON.parse(accumulated.slice(sourcesIdx + 13)) } catch { /* ignore */ }
        }
        setMessages(prev => prev.map(m => m.id === aiMsg.id ? { ...m, content: displayText, sources } : m))
      }

      const sourcesIdx = accumulated.indexOf('\n\n__SOURCES__')
      let finalContent = accumulated
      let finalSources: Source[] | undefined
      if (sourcesIdx !== -1) {
        finalContent = accumulated.slice(0, sourcesIdx)
        try { finalSources = JSON.parse(accumulated.slice(sourcesIdx + 13)) } catch { /* ignore */ }
      }

      const finalMessages = newMessages.map(m =>
        m.id === aiMsg.id ? { ...m, content: finalContent, sources: finalSources } : m
      )
      setMessages(finalMessages)
      saveConversation(finalMessages)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === aiMsg.id ? { ...m, content: m.content || '__interrupted__' } : m
        ))
      } else {
        setMessages(prev => prev.map(m =>
          m.id === aiMsg.id
            ? { ...m, content: `❌ Erro ao gerar resposta. Detalhe: ${err instanceof Error ? err.message : String(err)}` }
            : m
        ))
      }
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }

  function handleStop() { abortRef.current?.abort(); setIsLoading(false) }

  function handleProviderChange(nextProvider: Provider) {
    setProvider(nextProvider)
    saveStoredSettings({ defaultProvider: nextProvider })
  }

  const isStreaming = isLoading && messages[messages.length - 1]?.role === 'assistant'

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg)' }}>
      {/* Status banner — minimal, editorial */}
      {docsCount === 0 && (
        <div
          className="flex items-center gap-2 px-6 py-2 text-[12px]"
          style={{
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-accent-soft)',
            color: 'var(--color-accent-deep)',
          }}
        >
          <Database className="w-3 h-3 shrink-0" />
          <span>
            Base sem documentação indexada.{' '}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('nixa-open-workspace', { detail: { tab: 'index' } }))}
              className="underline underline-offset-2 hover:opacity-70"
            >
              Indexar agora
            </button>
          </span>
        </div>
      )}
      {docsCount != null && docsCount > 0 && (
        <div
          className="flex items-center justify-center gap-1.5 px-6 py-1.5 text-[10.5px] font-mono tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <Database className="w-2.5 h-2.5" />
          {docsCount.toLocaleString('pt-BR')} chunks · base ativa
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {messages.length === 0 ? (
          <EmptyState onSuggest={q => handleSubmit(q)} />
        ) : (
          <div className="max-w-2xl mx-auto py-8 px-6">
            {messages.map((msg, i) => (
              <Message
                key={msg.id}
                message={msg}
                isStreaming={isStreaming && i === messages.length - 1}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-6 pb-6 pt-2">
        <div className="max-w-2xl mx-auto">
          <MessageInput
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
