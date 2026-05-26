'use client'

import { ChatInterface } from '@/features/chat/containers/ChatInterface'
import { Sidebar } from '@/features/sidebar/containers/Sidebar'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Conversation } from '@/shared/types'
import { PanelLeft, KeyRound, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

type GateState = 'loading' | 'key' | 'index' | 'done'

export default function Home() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [chatKey, setChatKey] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [checkedOnboarding, setCheckedOnboarding] = useState(false)
  const [gateState, setGateState] = useState<GateState>('loading')
  const router = useRouter()

  useEffect(() => {
    const done = localStorage.getItem('nixa-onboarding-v1') === 'done'
    if (!done) { router.replace('/onboarding'); return }
    setCheckedOnboarding(true)
  }, [router])

  async function checkGate() {
    try {
      const [settingsRes, docsRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/index-docs'),
      ])
      const settings = await settingsRes.json() as { hasKeys?: Record<string, boolean> }
      const docs     = await docsRes.json()     as { count: number }

      const hasAnyKey = Object.values(settings.hasKeys ?? {}).some(Boolean)
      if (!hasAnyKey) { setGateState('key');   return }
      if ((docs.count ?? 0) === 0) { setGateState('index'); return }
      setGateState('done')
    } catch {
      setGateState('done') // don't block if API is unreachable
    }
  }

  useEffect(() => {
    if (!checkedOnboarding) return
    checkGate()
  }, [checkedOnboarding])

  // Re-check gate whenever WorkspaceModal closes
  useEffect(() => {
    const handler = () => checkGate()
    window.addEventListener('nixa-modal-closed', handler)
    return () => window.removeEventListener('nixa-modal-closed', handler)
  }, [])

  function openModal(tab: 'settings' | 'index') {
    window.dispatchEvent(new CustomEvent('nixa-open-workspace', { detail: { tab } }))
  }

  function handleNewConversation() {
    setActiveConversationId(null)
    setChatKey(k => k + 1)
  }
  function handleConversationSaved(conv: Conversation) {
    setActiveConversationId(conv.id)
    setRefreshTrigger(t => t + 1)
  }

  if (!checkedOnboarding) return <div className="h-full w-full" style={{ background: 'var(--color-bg)' }} />

  const showGate = gateState === 'key' || gateState === 'index'

  return (
    <div className="flex h-full relative">
      {mobileSidebarOpen && (
        <button
          className="fixed inset-0 bg-black/35 z-30 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Fechar menu lateral"
        />
      )}

      <div className={cn(
        'fixed md:relative inset-y-0 left-0 z-40 transition-transform duration-200',
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
        <Sidebar
          activeId={activeConversationId}
          refreshTrigger={refreshTrigger}
          onSelectConversation={setActiveConversationId}
          onNewChat={handleNewConversation}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(v => !v)}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
      </div>

      <main className="flex-1 flex flex-col min-w-0">
        <div
          className="md:hidden h-12 px-4 flex items-center"
          style={{
            borderBottom: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
          }}
        >
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="w-8 h-8 rounded-md flex items-center justify-center transition-colors"
            style={{ color: 'var(--color-text-soft)' }}
            title="Abrir menu"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <span className="ml-2 font-display font-semibold text-[18px]" style={{ color: 'var(--color-text)' }}>
            Nixa
          </span>
        </div>
        <ChatInterface
          key={`${activeConversationId ?? 'new'}-${chatKey}`}
          conversationId={activeConversationId}
          onConversationSaved={handleConversationSaved}
        />
      </main>

      {/* Setup gate */}
      {showGate && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-md"
          style={{ background: 'rgba(15, 14, 12, 0.45)' }}
        >
          <div className="w-full max-w-md mx-4 space-y-5">

            {/* Step indicator — editorial */}
            <div className="flex items-center justify-center gap-3 text-[11px] tracking-[0.15em] uppercase font-mono"
                 style={{ color: '#F5F2EA' }}>
              <span style={{ opacity: gateState === 'key' ? 1 : 0.5 }}>
                {gateState === 'key' ? '01' : '✓'} Chave
              </span>
              <span style={{ opacity: 0.3 }}>·</span>
              <span style={{ opacity: gateState === 'index' ? 1 : 0.4 }}>
                02 Indexar
              </span>
            </div>

            {/* Gate card */}
            {gateState === 'key' && (
              <button
                onClick={() => openModal('settings')}
                className="group w-full text-left rounded-[22px] overflow-hidden transition-all duration-200 hover:scale-[1.01]"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 24px 60px -12px rgba(15,14,12,0.5)',
                }}
              >
                <div className="p-6">
                  <div className="mb-5">
                    <p
                      className="text-[10.5px] tracking-[0.18em] uppercase font-mono mb-2"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      Primeiro passo
                    </p>
                    <h2 className="font-display font-semibold text-[28px] leading-tight tracking-tight" style={{ color: 'var(--color-text)' }}>
                      Adicione sua chave.
                    </h2>
                    <p className="text-[14px] mt-2 leading-relaxed" style={{ color: 'var(--color-text-soft)' }}>
                      Gemini (gratuita), OpenAI ou Ollama (local, sem custo) para gerar embeddings e respostas.
                    </p>
                  </div>

                  <div
                    className="flex items-start gap-2 rounded-[14px] px-3.5 py-3"
                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
                    <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-soft)' }}>
                      Criptografada com{' '}
                      <span style={{ color: 'var(--color-text)' }} className="font-medium">AES-256-GCM</span>.
                      Nunca exposta nas respostas.
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                      <KeyRound className="w-3 h-3" />
                      Gemini é gratuito
                    </div>
                    <div
                      className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-medium transition-opacity group-hover:opacity-90"
                      style={{ background: 'var(--color-accent)', color: '#FFFFFF' }}
                    >
                      Configurar
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </button>
            )}

            {gateState === 'index' && (
              <button
                onClick={() => openModal('index')}
                className="group w-full text-left rounded-[22px] overflow-hidden transition-all duration-200 hover:scale-[1.01]"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 24px 60px -12px rgba(15,14,12,0.5)',
                }}
              >
                <div className="p-6">
                  <div className="mb-5">
                    <p
                      className="text-[10.5px] tracking-[0.18em] uppercase font-mono mb-2"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      Quase lá
                    </p>
                    <h2 className="font-display font-semibold text-[28px] leading-tight tracking-tight" style={{ color: 'var(--color-text)' }}>
                      Indexe a documentação.
                    </h2>
                    <p className="text-[14px] mt-2 leading-relaxed" style={{ color: 'var(--color-text-soft)' }}>
                      Chave configurada. Agora a Nixa precisa absorver as docs NICE/CXone para começar a responder.
                    </p>
                  </div>

                  <div
                    className="flex items-start gap-2 rounded-[14px] px-3.5 py-3"
                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
                    <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-soft)' }}>
                      URLs já indexadas são puladas — sem reprocessar o que já existe.
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                      pode levar alguns minutos
                    </span>
                    <div
                      className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-medium transition-opacity group-hover:opacity-90"
                      style={{ background: 'var(--color-accent)', color: '#FFFFFF' }}
                    >
                      <Sparkles className="w-3 h-3" />
                      Indexar
                    </div>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
