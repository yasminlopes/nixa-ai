'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Database,
  ArrowRight,
  ChevronLeft,
  Play,
} from 'lucide-react'
import { ProviderIcon } from '@/shared/components/ProviderIcon'
import { type Provider } from '@/core/providers'

type SettingsPayload = {
  defaultProvider: Provider
  hasKeys: Record<Provider, boolean>
  message?: string
}

const PROVIDERS: Array<{ id: Provider; label: string; description: string }> = [
  { id: 'gemini',    label: 'Gemini',    description: 'Rápido e estável, ideal para uso geral.' },
  { id: 'openai',    label: 'OpenAI',    description: 'Respostas amplas e consistentes.' },
  { id: 'anthropic', label: 'Anthropic', description: 'Excelente para contexto longo.' },
  { id: 'groq',      label: 'Groq',      description: 'Ultra rápido com latência baixa.' },
]

const STEPS = ['Boas-vindas', 'Seu nome', 'Indexação', 'Modelo', 'Pronto']

export default function OnboardingPage() {
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')

  const [docsCount, setDocsCount] = useState<number | null>(null)
  const [checkingDocs, setCheckingDocs] = useState(false)
  const [showIndexInfo, setShowIndexInfo] = useState(false)

  const [provider, setProvider] = useState<Provider>('gemini')
  const [hasKeys, setHasKeys] = useState<Record<Provider, boolean>>({
    gemini: false, openai: false, anthropic: false, groq: false, huggingface: false,
  })
  const [savingProvider, setSavingProvider] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [scanPhase, setScanPhase] = useState<'idle' | 'scanning' | 'done'>('idle')
  const [scanTick, setScanTick] = useState(0)
  const [finalChecklistProgress, setFinalChecklistProgress] = useState(0)

  const nameInputRef = useRef<HTMLInputElement>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const done = localStorage.getItem('nixa-onboarding-v1') === 'done'
    if (done) { router.replace('/'); return }
    const storedName = localStorage.getItem('nixa-user-name')
    if (storedName) setName(storedName)
    refreshDocsStatus()
    loadSettings()
    setReady(true)
  }, [router])

  useEffect(() => {
    if (step === 1) nameInputRef.current?.focus()
  }, [step])

  useEffect(() => {
    if (step === 2) void runIndexQuickScan()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  useEffect(() => {
    let cancelled = false
    async function runFinalChecklist() {
      if (step !== 4) return
      setFinalChecklistProgress(0)
      for (let i = 1; i <= 3; i++) {
        await wait(430)
        if (cancelled) return
        setFinalChecklistProgress(i)
      }
    }
    void runFinalChecklist()
    return () => { cancelled = true }
  }, [step])

  async function refreshDocsStatus() {
    setCheckingDocs(true)
    try {
      const res = await fetch('/api/index-docs')
      const data = (await res.json()) as { count: number }
      setDocsCount(data.count ?? 0)
    } catch { setDocsCount(0) }
    finally { setCheckingDocs(false) }
  }

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings')
      const data = (await res.json()) as SettingsPayload
      if (res.ok) { setProvider(data.defaultProvider); setHasKeys(data.hasKeys) }
    } catch { /* ignore */ }
  }

  async function persistProviderSelection() {
    setSavingProvider(true); setError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultProvider: provider }),
      })
      const payload = (await res.json()) as SettingsPayload
      if (!res.ok) throw new Error(payload.message ?? 'Falha ao salvar LLM inicial')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar LLM inicial')
      return false
    } finally { setSavingProvider(false) }
    return true
  }

  function wait(ms: number) { return new Promise(r => setTimeout(r, ms)) }

  async function runIndexQuickScan() {
    setScanPhase('scanning'); setScanTick(0)
    for (let i = 1; i <= 3; i++) { await wait(260); setScanTick(i) }
    await refreshDocsStatus()
    await wait(220)
    setScanPhase('done')
  }

  async function handleContinue() {
    if (step === 1 && !name.trim()) return
    if (step === 3) { const ok = await persistProviderSelection(); if (!ok) return }
    if (step === 4) {
      localStorage.setItem('nixa-user-name', name.trim())
      localStorage.setItem('nixa-onboarding-v1', 'done')
      router.replace('/')
      return
    }
    setIsTyping(true)
    await wait(600)
    setIsTyping(false)
    setStep(prev => prev + 1)
  }

  function handleBack() { setStep(prev => Math.max(0, prev - 1)) }

  if (!ready) return <div className="h-screen w-full bg-[#080f1e]" />

  // ── Step 0: Welcome screen with video ──────────────────────────────────────
  if (step === 0) {
    return (
      <>
        <style>{`
          @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
          @keyframes glow   { 0%,100% { box-shadow:0 0 32px 8px #4cacc740 } 50% { box-shadow:0 0 56px 16px #4cacc760 } }
          @keyframes pulse-ring { 0% { transform:scale(1); opacity:.6 } 100% { transform:scale(1.18); opacity:0 } }
          .anim-fade-up      { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) both }
          .anim-fade-up-slow { animation: fadeUp .9s cubic-bezier(.22,1,.36,1) .25s both }
          .anim-fade-up-d2   { animation: fadeUp .9s cubic-bezier(.22,1,.36,1) .5s both }
          .anim-glow         { animation: glow 3s ease-in-out infinite }
          .pulse-ring        { animation: pulse-ring 2s ease-out infinite }
        `}</style>
        <main className="min-h-screen flex items-center justify-center bg-[#080f1e] relative overflow-hidden px-4">
          {/* Background grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(79,122,150,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(79,122,150,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
          {/* Radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_60%,#0d2a4440,transparent)]" />

          <div className="relative z-10 flex flex-col items-center text-center gap-10 max-w-lg w-full">
            {/* Video / Avatar */}
            <div className="anim-fade-up relative">
              {/* Pulse rings */}
              <div className="absolute inset-0 rounded-3xl pulse-ring border border-[#4cacc7]/30" />
              <div className="absolute inset-0 rounded-3xl pulse-ring border border-[#4cacc7]/20 [animation-delay:.8s]" />
              {/* Video container */}
              <div className="anim-glow relative w-56 h-56 rounded-3xl overflow-hidden border border-white/10 bg-[#0d1e33]">
                <video
                  src="/assets/nixa-video.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
                {/* Subtle gradient overlay at bottom */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#080f1e]/60 to-transparent" />
              </div>
            </div>

            {/* Text */}
            <div className="space-y-3 anim-fade-up-slow">
              <h1 className="text-3xl font-semibold text-white tracking-tight">
                Olá, sou a <span className="text-[#4cacc7]">Nixa</span>
              </h1>
              <p className="text-[#8ba8c0] text-base leading-relaxed">
                Sua especialista em documentação NICE CXone. <br />
                Vou te guiar em uma configuração rápida.
              </p>
            </div>

            {/* CTA */}
            <div className="anim-fade-up-d2 flex flex-col items-center gap-3">
              <button
                onClick={handleContinue}
                disabled={isTyping}
                className="group flex items-center gap-2 rounded-xl bg-[#4f7a96] hover:bg-[#4cacc7] text-white px-7 py-3 text-sm font-medium transition-all duration-200 disabled:opacity-60 shadow-lg shadow-[#4f7a96]/30 hover:shadow-[#4cacc7]/40"
              >
                {isTyping ? 'Um momento...' : 'Começar configuração'}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <p className="text-xs text-[#4a6a88]">Leva menos de 2 minutos</p>
            </div>
          </div>
        </main>
      </>
    )
  }

  // ── Steps 1–4 ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes fadeUp   { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
        @keyframes slideIn  { from { opacity:0; transform:translateX(-8px) } to { opacity:1; transform:translateX(0) } }
        .anim-fade-up { animation: fadeUp .4s cubic-bezier(.22,1,.36,1) both }
        .anim-fade-in { animation: fadeIn .3s ease both }
        .anim-slide-in{ animation: slideIn .35s cubic-bezier(.22,1,.36,1) both }
      `}</style>
      <main className="min-h-screen flex items-center justify-center bg-[#080f1e] relative overflow-hidden px-4 py-8">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(79,122,150,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(79,122,150,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,#0d2a4425,transparent)]" />

        <div className="relative z-10 w-full max-w-xl">
          {/* Card */}
          <div className="rounded-2xl border border-white/8 bg-[#0d1e33]/90 backdrop-blur-sm shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 border-b border-white/6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/10">
                  <video
                    src="/assets/nixa-video.mp4"
                    autoPlay muted loop playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-sm font-medium text-white/80">Nixa AI</span>
              </div>

              {/* Step dots */}
              <div className="flex items-center gap-1.5">
                {STEPS.slice(1).map((_, i) => {
                  const idx = i + 1
                  return (
                    <div
                      key={idx}
                      className={`rounded-full transition-all duration-300 ${
                        idx < step
                          ? 'w-2 h-2 bg-[#4cacc7]'
                          : idx === step
                          ? 'w-5 h-2 bg-[#4f7a96]'
                          : 'w-2 h-2 bg-white/15'
                      }`}
                    />
                  )
                })}
              </div>
            </div>

            {/* Chat content */}
            <div className="px-5 py-5 min-h-[380px] max-h-[55vh] overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-white/10">

              {/* Nixa message — step 1 */}
              {step >= 1 && (
                <ChatBubble side="left" delay={0}>
                  Como posso te chamar?
                </ChatBubble>
              )}

              {/* User name reply */}
              {step >= 2 && name.trim() && (
                <ChatBubble side="right" delay={0}>
                  {name}
                </ChatBubble>
              )}

              {/* Nixa greeting with name */}
              {step >= 2 && name.trim() && (
                <ChatBubble side="left" delay={100}>
                  Prazer, {name.trim()}! Vou checar sua base de conhecimento agora.
                </ChatBubble>
              )}

              {/* Step 1 — name input */}
              {step === 1 && (
                <div className="pl-11 anim-fade-up">
                  <input
                    ref={nameInputRef}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') void handleContinue() }}
                    placeholder="Digite seu nome"
                    className="w-full rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 px-4 py-3 text-sm outline-none focus:border-[#4cacc7]/60 focus:bg-white/8 transition-colors"
                  />
                </div>
              )}

              {/* Step 2 — docs scan */}
              {step === 2 && (
                <div className="pl-11 space-y-3 anim-fade-up">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-[#8ba8c0]">Verificando indexação existente.</p>
                    <button
                      onClick={() => setShowIndexInfo(true)}
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-white/15 text-[#8ba8c0] hover:border-white/30 hover:text-white transition-colors"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </div>

                  {scanPhase === 'scanning' && (
                    <div className="rounded-xl border border-white/8 bg-white/4 p-4 text-sm">
                      <div className="flex items-center gap-2 mb-3 text-[#4cacc7]">
                        <Database className="w-4 h-4" />
                        <span className="font-medium">Pesquisa em andamento</span>
                      </div>
                      <p className="text-xs text-[#8ba8c0] mb-3">
                        {scanTick === 0 && 'Lendo status local...'}
                        {scanTick === 1 && 'Validando chunks indexados...'}
                        {scanTick === 2 && 'Conferindo consistência...'}
                        {scanTick >= 3 && 'Finalizando...'}
                      </p>
                      <div className="h-1 rounded-full bg-white/8 overflow-hidden">
                        <div
                          className="h-full bg-[#4cacc7] transition-all duration-300"
                          style={{ width: `${Math.min(100, (scanTick + 1) * 25)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {scanPhase === 'done' && (
                    <div className="rounded-xl border border-white/8 bg-white/4 p-4 anim-fade-in">
                      <div className="flex items-center gap-2 mb-2 text-[#4cacc7]">
                        <Database className="w-4 h-4" />
                        <span className="text-sm font-medium">Status da base</span>
                      </div>
                      {docsCount != null && docsCount > 0 ? (
                        <div className="flex items-center gap-2 text-sm text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          {docsCount.toLocaleString('pt-BR')} chunks indexados — pronto para uso.
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 text-sm text-amber-400">
                          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                          Sem chunks ainda. Você pode indexar depois nas configurações.
                        </div>
                      )}
                      <button
                        onClick={refreshDocsStatus}
                        disabled={checkingDocs}
                        className="mt-3 rounded-lg border border-white/10 text-[#8ba8c0] hover:text-white hover:border-white/20 px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
                      >
                        {checkingDocs ? 'Verificando...' : 'Verificar novamente'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Nixa message — step 3 */}
              {step >= 3 && (
                <ChatBubble side="left" delay={0}>
                  Escolha o modelo de linguagem que prefere usar.
                </ChatBubble>
              )}

              {/* Step 3 — provider selector */}
              {step === 3 && (
                <div className="pl-11 space-y-2 anim-fade-up">
                  {PROVIDERS.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setProvider(item.id)}
                      className={`w-full rounded-xl border p-3.5 text-left transition-all duration-200 flex items-center gap-3 ${
                        provider === item.id
                          ? 'border-[#4cacc7]/60 bg-[#4cacc7]/10 text-white'
                          : 'border-white/8 bg-white/3 text-[#8ba8c0] hover:border-white/15 hover:bg-white/6'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${provider === item.id ? 'bg-[#4cacc7]/20' : 'bg-white/6'}`}>
                        <ProviderIcon provider={item.id} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{item.label}</span>
                          {hasKeys[item.id] && (
                            <span className="text-[10px] text-emerald-400 border border-emerald-400/30 rounded-full px-1.5 py-0.5 shrink-0">
                              chave ok
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#5d7594] mt-0.5">{item.description}</p>
                      </div>
                      {provider === item.id && (
                        <CheckCircle2 className="w-4 h-4 text-[#4cacc7] shrink-0" />
                      )}
                    </button>
                  ))}
                  {error && <p className="text-sm text-red-400">{error}</p>}
                </div>
              )}

              {/* Step 4 — final checklist */}
              {step === 4 && (
                <div className="pl-11 anim-fade-up">
                  <div className="rounded-xl border border-white/8 bg-white/4 p-4 space-y-2">
                    {([
                      { label: `Nome: ${name}`, status: 'ok' as const },
                      { label: `Modelo: ${PROVIDERS.find(p => p.id === provider)?.label}`, status: 'ok' as const },
                      { label: 'Indexação', status: (docsCount && docsCount > 0 ? 'ok' : 'pendente') as 'ok' | 'pendente' },
                    ]).map(({ label, status }, index) => {
                      const done = finalChecklistProgress >= index + 1
                      if (!done) return (
                        <div key={label} className="flex items-center gap-2 py-1">
                          <div className="w-4 h-4 rounded-full bg-white/10 animate-pulse" />
                          <div className="h-3 rounded bg-white/8 animate-pulse" style={{ width: `${80 + index * 20}px` }} />
                        </div>
                      )
                      const isOk = status === 'ok'
                      return (
                        <div key={label} className="flex items-center justify-between gap-2 anim-slide-in">
                          <div className="flex items-center gap-2 text-sm text-[#8ba8c0]">
                            {isOk
                              ? <CheckCircle2 className="w-4 h-4 text-[#4cacc7] shrink-0" />
                              : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            }
                            {label}
                          </div>
                          {isOk
                            ? <span className="text-[10px] text-emerald-400 border border-emerald-400/30 rounded-full px-1.5 py-0.5">ok</span>
                            : <span className="text-[10px] text-amber-400 border border-amber-400/30 rounded-full px-1.5 py-0.5">pendente</span>
                          }
                        </div>
                      )
                    })}
                  </div>

                  {finalChecklistProgress >= 3 && (
                    <div className={`mt-4 rounded-xl p-4 text-center anim-fade-in ${docsCount && docsCount > 0 ? 'bg-[#4cacc7]/10 border border-[#4cacc7]/20' : 'bg-amber-500/8 border border-amber-400/20'}`}>
                      <p className={`text-sm font-medium ${docsCount && docsCount > 0 ? 'text-[#4cacc7]' : 'text-amber-400'}`}>
                        {docsCount && docsCount > 0 ? 'Tudo pronto!' : 'Quase lá!'}
                      </p>
                      <p className="text-xs text-[#8ba8c0] mt-1">
                        {docsCount && docsCount > 0
                          ? 'Você pode começar a usar a Nixa agora.'
                          : 'Indexe a documentação depois em Configurações → Indexar para melhorar as respostas.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-start gap-3 anim-fade-in">
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 shrink-0">
                    <video src="/assets/nixa-video.mp4" autoPlay muted loop playsInline className="w-full h-full object-cover" />
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4cacc7] animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4cacc7] animate-bounce [animation-delay:120ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4cacc7] animate-bounce [animation-delay:240ms]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={logsEndRef} />
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/6 flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={savingProvider || isTyping}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 text-[#8ba8c0] hover:text-white hover:border-white/20 px-3 py-2 text-sm transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>

              <button
                onClick={handleContinue}
                disabled={
                  (step === 1 && !name.trim()) ||
                  savingProvider || isTyping ||
                  (step === 4 && finalChecklistProgress < 3)
                }
                className="group flex items-center gap-2 rounded-xl bg-[#4f7a96] hover:bg-[#4cacc7] text-white px-5 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === 4
                  ? finalChecklistProgress < 3 ? 'Finalizando...' : 'Começar a usar'
                  : step === 3 && savingProvider
                  ? 'Salvando...'
                  : isTyping
                  ? 'Aguarde...'
                  : 'Continuar'}
                {!(step === 4 && finalChecklistProgress < 3) && !savingProvider && !isTyping && (
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Info modal */}
      {showIndexInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1e33] shadow-2xl overflow-hidden anim-fade-up">
            <div className="px-5 py-4 border-b border-white/6">
              <h3 className="text-base font-semibold text-white">O que é indexação?</h3>
            </div>
            <div className="px-5 py-4 text-sm text-[#8ba8c0] space-y-3 leading-relaxed">
              <p>Indexação é o processo de ler as documentações NICE/CXone, quebrar em partes menores e salvar numa base de busca vetorial.</p>
              <p>Assim, quando você pergunta algo, a Nixa encontra trechos relevantes e responde com precisão sobre os produtos NICE.</p>
              <p>Você pode usar sem indexar, mas a qualidade das respostas melhora bastante após a indexação.</p>
            </div>
            <div className="px-5 py-4 border-t border-white/6 flex justify-end">
              <button
                onClick={() => setShowIndexInfo(false)}
                className="rounded-lg bg-[#4f7a96] hover:bg-[#4cacc7] text-white px-4 py-2 text-sm transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── ChatBubble helper ──────────────────────────────────────────────────────────

function ChatBubble({
  side,
  children,
  delay = 0,
}: {
  side: 'left' | 'right'
  children: React.ReactNode
  delay?: number
}) {
  if (side === 'left') {
    return (
      <div
        className="flex items-start gap-3 anim-fade-up"
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 shrink-0">
          <video src="/assets/nixa-video.mp4" autoPlay muted loop playsInline className="w-full h-full object-cover" />
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-[#c8dff0] leading-relaxed max-w-[85%]">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex justify-end anim-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="rounded-2xl bg-[#4f7a96] text-white px-4 py-3 text-sm max-w-[80%] leading-relaxed">
        {children}
      </div>
    </div>
  )
}
