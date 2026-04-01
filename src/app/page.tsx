'use client'

import { ChatInterface } from '@/features/chat/containers/ChatInterface'
import { Sidebar } from '@/features/sidebar/containers/Sidebar'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Conversation } from '@/shared/types'
import { PanelLeft, Zap, KeyRound, ShieldCheck, ArrowRight } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

type GateState = 'loading' | 'key' | 'index' | 'done'

export default function Home() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
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

  function handleNewConversation() { setActiveConversationId(null) }
  function handleConversationSaved(conv: Conversation) {
    setActiveConversationId(conv.id)
    setRefreshTrigger(t => t + 1)
  }

  if (!checkedOnboarding) return <div className="h-full w-full bg-[#fdfefe]" />

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
        <div className="md:hidden h-12 border-b border-[#d4e0f3] dark:border-[#2d3748] bg-[#fdfefe] dark:bg-[#0f1419] px-3 flex items-center">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="w-8 h-8 rounded-md flex items-center justify-center text-[#425f83] dark:text-[#9ac5ef] hover:bg-[#d4e0f3] dark:hover:bg-[#1a1f2e] transition-colors"
            title="Abrir menu"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <span className="ml-2 text-sm font-medium text-[#17223d] dark:text-[#e4e6eb]">Nixa AI</span>
        </div>
        <ChatInterface
          key={activeConversationId ?? 'new'}
          conversationId={activeConversationId}
          onConversationSaved={handleConversationSaved}
        />
      </main>

      {/* Setup gate — blurs chat until key + indexing are ready */}
      {showGate && (
        <div className="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-md bg-[#080f1e]/60">
          <div className="w-full max-w-md mx-4 space-y-3">

            {/* ── Step indicator ── */}
            <div className="flex items-center gap-2 px-1 mb-1">
              {/* Step 1 */}
              <div className={`flex items-center gap-1.5 text-xs font-medium ${gateState === 'key' ? 'text-[#4cacc7]' : 'text-emerald-400'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${gateState === 'key' ? 'border-[#4cacc7] text-[#4cacc7]' : 'border-emerald-400 bg-emerald-400/20 text-emerald-400'}`}>
                  {gateState === 'key' ? '1' : '✓'}
                </div>
                Chave de API
              </div>
              <div className="flex-1 h-px bg-white/10" />
              {/* Step 2 */}
              <div className={`flex items-center gap-1.5 text-xs font-medium ${gateState === 'index' ? 'text-[#4cacc7]' : 'text-white/30'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${gateState === 'index' ? 'border-[#4cacc7] text-[#4cacc7]' : 'border-white/20 text-white/30'}`}>
                  2
                </div>
                Indexar docs
              </div>
            </div>

            {/* ── Key gate ── */}
            {gateState === 'key' && (
              <button
                onClick={() => openModal('settings')}
                className="group w-full text-left rounded-2xl border border-white/12 bg-[#0d1e33]/95 shadow-2xl overflow-hidden hover:border-[#4cacc7]/40 transition-all duration-200"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#4cacc7]/50 to-transparent" />
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
                      <video src="/assets/nixa-video.mp4" autoPlay muted loop playsInline className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-semibold text-white mb-1">Adicione sua chave de API</p>
                      <p className="text-sm text-[#8ba8c0] leading-relaxed">
                        Para gerar embeddings e responder às perguntas, preciso de uma chave de API — Gemini (gratuita) ou OpenAI.
                      </p>
                    </div>
                  </div>

                  {/* Security note */}
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-white/4 border border-white/8 px-3.5 py-3">
                    <ShieldCheck className="w-4 h-4 text-[#4cacc7] shrink-0 mt-0.5" />
                    <p className="text-xs text-[#8ba8c0] leading-relaxed">
                      Sua chave é criptografada com <span className="text-white/70 font-medium">AES-256-GCM</span> antes de ser salva no servidor. Nunca é exposta nas respostas da API.
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-[#4a6a88]">
                      <KeyRound className="w-3.5 h-3.5" />
                      Gemini · Google AI Studio — gratuito
                    </div>
                    <div className="flex items-center gap-1.5 rounded-lg bg-[#4f7a96] group-hover:bg-[#4cacc7] text-white px-3.5 py-2 text-xs font-medium transition-colors">
                      Adicionar chave
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </button>
            )}

            {/* ── Index gate ── */}
            {gateState === 'index' && (
              <button
                onClick={() => openModal('index')}
                className="group w-full text-left rounded-2xl border border-white/12 bg-[#0d1e33]/95 shadow-2xl overflow-hidden hover:border-[#4cacc7]/40 transition-all duration-200"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#4cacc7]/50 to-transparent" />
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
                      <video src="/assets/nixa-video.mp4" autoPlay muted loop playsInline className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-semibold text-white mb-1">Indexar documentação</p>
                      <p className="text-sm text-[#8ba8c0] leading-relaxed">
                        Chave configurada! Agora vou ler as docs NICE/CXone e montar minha base de conhecimento.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-white/4 border border-white/8 px-3.5 py-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-[#8ba8c0] leading-relaxed">
                      URLs já indexadas são puladas automaticamente — sem reprocessar o que já existe.
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-xs text-[#4a6a88]">Pode levar alguns minutos</span>
                    <div className="flex items-center gap-1.5 rounded-lg bg-[#4f7a96] group-hover:bg-[#4cacc7] text-white px-3.5 py-2 text-xs font-medium transition-colors">
                      <Zap className="w-3.5 h-3.5" />
                      Indexar agora
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
