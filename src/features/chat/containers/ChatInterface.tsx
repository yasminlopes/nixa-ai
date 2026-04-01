'use client'

import { useEffect, useRef, useState } from 'react'
import { Zap, Database } from 'lucide-react'
import { Message as MessageType, Conversation, Source } from '@/shared/types'
import { type Provider } from '@/core/providers'
import { Message } from '../components/Message'
import { MessageInput } from '../components/MessageInput'

type SettingsPayload = {
  defaultProvider: Provider
  hasKeys?: Partial<Record<Provider, boolean>>
  message?: string
}

const SUGGESTED = [
  'O que é o CXone e quais são seus principais módulos?',
  'Como autenticar na API REST do CXone?',
  'Como configurar uma fila de atendimento (ACD)?',
  'Quais relatórios estão disponíveis na Reporting API?',
]

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
  const [isSavingProvider, setIsSavingProvider] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Load existing conversation
  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      return
    }
    try {
      const stored = localStorage.getItem('nixa-conversations')
      if (stored) {
        const convs: Conversation[] = JSON.parse(stored)
        const conv = convs.find(c => c.id === conversationId)
        if (conv) setMessages(conv.messages)
      }
    } catch {
      // ignore
    }
  }, [conversationId])

  // Check docs index status
  useEffect(() => {
    fetch('/api/index-docs')
      .then(r => r.json())
      .then((d: { count: number }) => setDocsCount(d.count))
      .catch(() => setDocsCount(0))
  }, [])

  // Load active LLM provider + which providers have keys
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then((d: SettingsPayload) => {
        if (d.defaultProvider) setProvider(d.defaultProvider)
        if (d.hasKeys) setHasKeys(d.hasKeys)
      })
      .catch(() => {})
  }, [])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function saveConversation(msgs: MessageType[]) {
    const title =
      msgs.find(m => m.role === 'user')?.content.slice(0, 60) ?? 'Nova conversa'

    const stored = localStorage.getItem('nixa-conversations')
    const convs: Conversation[] = stored ? JSON.parse(stored) : []

    const existing = convs.find(c => c.id === (conversationId ?? ''))
    const now = new Date()

    let updated: Conversation[]
    let savedConv: Conversation

    if (existing) {
      savedConv = { ...existing, messages: msgs, updatedAt: now }
      updated = convs.map(c => (c.id === savedConv.id ? savedConv : c))
    } else {
      savedConv = {
        id: crypto.randomUUID(),
        title,
        messages: msgs,
        createdAt: now,
        updatedAt: now,
      }
      updated = [savedConv, ...convs]
    }

    localStorage.setItem('nixa-conversations', JSON.stringify(updated))
    onConversationSaved(savedConv)
  }

  async function handleSubmit(text?: string) {
    const content = (text ?? input).trim()
    if (!content || isLoading) return
    setInput('')

    const userMsg: MessageType = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date(),
    }

    const aiMsg: MessageType = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    }

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
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error('Falha ao chamar a API')

      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        const payload = (await res.json()) as {
          message?: string
          sources?: Source[]
        }

        const finalMessages = newMessages.map(m =>
          m.id === aiMsg.id
            ? {
                ...m,
                content: payload.message ?? 'Sem resposta no momento.',
                sources: payload.sources,
              }
            : m
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

        // Parse sources marker
        const sourcesIdx = accumulated.indexOf('\n\n__SOURCES__')
        let displayText = accumulated
        let sources: Source[] | undefined

        if (sourcesIdx !== -1) {
          displayText = accumulated.slice(0, sourcesIdx)
          try {
            sources = JSON.parse(accumulated.slice(sourcesIdx + 13))
          } catch {
            // ignore parse error
          }
        }

        setMessages(prev =>
          prev.map(m =>
            m.id === aiMsg.id ? { ...m, content: displayText, sources } : m
          )
        )
      }

      // Final state after stream
      const sourcesIdx = accumulated.indexOf('\n\n__SOURCES__')
      let finalContent = accumulated
      let finalSources: Source[] | undefined

      if (sourcesIdx !== -1) {
        finalContent = accumulated.slice(0, sourcesIdx)
        try {
          finalSources = JSON.parse(accumulated.slice(sourcesIdx + 13))
        } catch { /**/ }
      }

      const finalMessages = newMessages.map(m =>
        m.id === aiMsg.id
          ? { ...m, content: finalContent, sources: finalSources }
          : m
      )

      setMessages(finalMessages)
      saveConversation(finalMessages)
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setMessages(prev =>
          prev.map(m =>
            m.id === aiMsg.id
              ? { ...m, content: `❌ Erro ao gerar resposta. Detalhe: ${err instanceof Error ? err.message : String(err)}` }
              : m
          )
        )
      } else if (err instanceof Error && err.name === 'AbortError') {
        // User paused the generation
        setMessages(prev =>
          prev.map(m =>
            m.id === aiMsg.id
              ? { ...m, content: m.content || '⏸️ Resposta interrompida pelo usuário.' }
              : m
          )
        )
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

  async function handleProviderChange(nextProvider: Provider) {
    setProvider(nextProvider)
    setIsSavingProvider(true)

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultProvider: nextProvider }),
      })

      if (!res.ok) {
        const payload = (await res.json()) as SettingsPayload
        throw new Error(payload.message ?? 'Falha ao trocar LLM')
      }
    } catch {
      // Roll back to previous provider if save fails
      fetch('/api/settings')
        .then(r => r.json())
        .then((d: SettingsPayload) => {
          if (d.defaultProvider) setProvider(d.defaultProvider)
        })
        .catch(() => {
          // keep local selection if refresh fails
        })
    } finally {
      setIsSavingProvider(false)
    }
  }

  const isStreaming = isLoading && messages[messages.length - 1]?.role === 'assistant'

  return (
    <div className="flex flex-col h-full bg-[#fdfefe] dark:bg-[#0f1419]">
      {/* Docs status banner */}
      {docsCount === 0 && (
        <div className="bg-[#d4e0f3] dark:bg-[#1a1f2e] border-b border-[#94a6b8] dark:border-[#2d3748] px-4 py-2 flex items-center gap-2 text-sm text-[#17223d] dark:text-[#e4e6eb]">
          <Database className="w-4 h-4 shrink-0" />
          <span>
            Documentação não indexada. Clique em{' '}
            <strong>"Indexar documentação"</strong> na barra lateral para ativar o RAG.
          </span>
        </div>
      )}
      {docsCount != null && docsCount > 0 && (
        <div className="bg-[#e9f7fc] dark:bg-[#1a1f2e] border-b border-[#9ac5ef] dark:border-[#2d3748] px-4 py-1.5 flex items-center gap-2 text-xs text-[#425f83] dark:text-[#9ac5ef]">
          <Database className="w-3.5 h-3.5" />
          {docsCount} chunks indexados das docs NICE/CXone
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {messages.length === 0 ? (
          <EmptyState onSuggest={q => handleSubmit(q)} />
        ) : (
          <div className="max-w-3xl mx-auto py-6">
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

      {/* Input area */}
      <div className="border-t border-[#d4e0f3] dark:border-[#2d3748] bg-[#fdfefe] dark:bg-[#0f1419] px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <MessageInput
            value={input}
            onChange={setInput}
            onSubmit={() => handleSubmit()}
            onStop={handleStop}
            isLoading={isLoading}
            provider={provider}
            onProviderChange={handleProviderChange}
            isSavingProvider={isSavingProvider}
            hasKeys={hasKeys}
          />
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onSuggest }: { onSuggest: (q: string) => void }) {
  const [showMascot, setShowMascot] = useState(true)

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] px-6 text-center">
      {showMascot ? (
        <img
          src="/assets/nixa.png"
          alt="Mascote Nixa"
          className="w-24 h-24 object-contain mb-4 drop-shadow-md animate-fadeIn"
          onError={() => setShowMascot(false)}
        />
      ) : (
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4f7a96] to-[#4cacc7]
                        flex items-center justify-center mb-5 shadow-lg shadow-[#d4e0f3] animate-fadeInUp animate-glow">
          <Zap className="w-7 h-7 text-white animate-pulse-soft" />
        </div>
      )}
      <h1 className="text-2xl font-semibold text-[#17223d] dark:text-[#e4e6eb] mb-1 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>Nixa AI</h1>
      <p className="text-[#425f83] dark:text-[#9ac5ef] text-sm mb-8 max-w-sm animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
        Olá, sou a Nixa, irei te auxiliar com dúvidas sobre NICE e CXone.
        Pode perguntar sobre APIs, configurações e funcionalidades.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
        {SUGGESTED.map((q, idx) => (
          <button
            key={q}
            onClick={() => onSuggest(q)}
            style={{ animationDelay: `${0.3 + idx * 0.1}s` }}
            className="text-left text-sm px-4 py-3 rounded-xl border border-[#d4e0f3] dark:border-[#2d3748]
                       bg-white dark:bg-[#1a1f2e] hover:bg-[#e9f7fc] dark:hover:bg-[#252d3d] hover:border-[#9ac5ef]
                       text-[#17223d] dark:text-[#e4e6eb] hover:text-[#4f7a96] dark:hover:text-[#9ac5ef] transition-all shadow-sm
                       animate-fadeInUp hover:scale-105 hover:shadow-md"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
