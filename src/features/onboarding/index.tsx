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
} from 'lucide-react'
import { ProviderIcon } from '@/shared/components/provider-icon'
import { useIsHosted } from '@/shared/hooks/use-is-hosted'
import { type Provider } from '@/core/providers'

type SettingsPayload = {
  defaultProvider: Provider
  hasKeys: Record<Provider, boolean>
  message?: string
}

const PROVIDERS: Array<{ id: Provider; label: string; description: string }> = [
  { id: 'gemini', label: 'Gemini',  description: 'Rápido e estável, ideal para uso geral. Tier gratuito disponível.' },
  { id: 'openai', label: 'OpenAI',  description: 'Respostas amplas e consistentes.' },
  { id: 'ollama', label: 'Ollama',  description: 'Roda 100% local, sem chave nem custo. Exige Ollama instalado e o projeto rodando na sua máquina.' },
]

const STEPS = ['Boas-vindas', 'Seu nome', 'Indexação', 'Modelo', 'Pronto']

export function OnboardingView() {
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')

  const [docsCount, setDocsCount] = useState<number | null>(null)
  const [checkingDocs, setCheckingDocs] = useState(false)
  const [showIndexInfo, setShowIndexInfo] = useState(false)

  const [provider, setProvider] = useState<Provider>('gemini')
  const [hasKeys, setHasKeys] = useState<Record<Provider, boolean>>({
    gemini: false, openai: false, ollama: true,
  })
  const [savingProvider, setSavingProvider] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [scanPhase, setScanPhase] = useState<'idle' | 'scanning' | 'done'>('idle')
  const [scanTick, setScanTick] = useState(0)
  const [finalChecklistProgress, setFinalChecklistProgress] = useState(0)

  const nameInputRef = useRef<HTMLInputElement>(null)
  const isHosted = useIsHosted()
  const visibleProviders = isHosted ? PROVIDERS.filter(p => p.id !== 'ollama') : PROVIDERS

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
    if (isHosted && provider === 'ollama') setProvider('gemini')
  }, [isHosted, provider])

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
        await wait(400)
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
    await wait(500)
    setIsTyping(false)
    setStep(prev => prev + 1)
  }

  function handleBack() { setStep(prev => Math.max(0, prev - 1)) }

  if (!ready) return <div className="h-screen w-full" style={{ background: 'var(--color-bg)' }} />

  // ── Step 0: Welcome ─────────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="max-w-xl w-full text-left">
          <p
            className="text-[11px] tracking-[0.2em] uppercase font-mono mb-8 animate-fadeIn"
            style={{ color: 'var(--color-accent)' }}
          >
            — uma assistente em NICE CXone
          </p>

          <div className="flex items-center gap-4 mb-6 animate-fadeIn" style={{ animationDelay: '0.05s' }}>
            <div className="w-16 h-16 rounded-2xl overflow-hidden nixa-glow"
                 style={{ background: 'linear-gradient(135deg, #4F7AFF 0%, #A78BFA 100%)' }}>
              <video src="/assets/nixa-video.mp4" autoPlay muted loop playsInline className="w-full h-full object-cover" />
            </div>
          </div>

          <h1
            className="font-display font-semibold text-[56px] sm:text-[72px] leading-[1.02] tracking-tight mb-6 animate-fadeIn"
            style={{ animationDelay: '0.1s', color: 'var(--color-text)' }}
          >
            Olá. Sou a{' '}
            <span style={{ color: 'var(--color-accent)' }}>Nixa</span>.
          </h1>

          <p
            className="font-sans text-[20px] leading-relaxed max-w-md mb-12 animate-fadeIn"
            style={{ animationDelay: '0.2s', color: 'var(--color-text-soft)' }}
          >
            Vou te guiar numa configuração rápida para começarmos a trabalhar juntos.
          </p>

          <div className="animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            <button
              onClick={handleContinue}
              disabled={isTyping}
              className="group inline-flex items-center gap-2 rounded-full px-7 py-3 text-[14px] font-medium transition-all disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'var(--color-accent)', color: '#FFFFFF' }}
            >
              {isTyping ? 'Um momento…' : 'Começar'}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <p
              className="text-[11px] font-mono mt-3 tracking-wide"
              style={{ color: 'var(--color-text-muted)' }}
            >
              leva menos de 2 minutos
            </p>
          </div>
        </div>
      </main>
    )
  }

  // ── Steps 1–4 ──────────────────────────────────────────────────────────────
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-10"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <span
              className="font-display font-semibold text-[18px]"
              style={{ color: 'var(--color-text)' }}
            >
              Nixa
            </span>
            <span
              className="text-[10px] font-mono tracking-[0.18em] uppercase"
              style={{ color: 'var(--color-text-muted)' }}
            >
              configurando
            </span>
          </div>
          <div className="flex items-center gap-2">
            {STEPS.slice(1).map((_, i) => {
              const idx = i + 1
              return (
                <div
                  key={idx}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width:  idx === step ? 20 : 5,
                    height: 5,
                    background:
                      idx < step  ? 'var(--color-accent)' :
                      idx === step ? 'var(--color-accent)' :
                      'var(--color-border-strong)',
                  }}
                />
              )
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="min-h-[400px] space-y-8">
          {/* STEP 1 — name */}
          {step === 1 && (
            <div className="animate-fadeIn space-y-6">
              <div>
                <p
                  className="text-[10.5px] tracking-[0.18em] uppercase font-mono mb-3"
                  style={{ color: 'var(--color-accent)' }}
                >
                  Primeiro
                </p>
                <h2
                  className="font-display font-semibold text-[42px] sm:text-[54px] leading-[1.05] tracking-tight"
                  style={{ color: 'var(--color-text)' }}
                >
                  Como posso te chamar?
                </h2>
              </div>
              <input
                ref={nameInputRef}
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleContinue() }}
                placeholder="Seu nome"
                className="w-full font-display font-medium text-[28px] bg-transparent outline-none border-b pb-3 transition-colors"
                style={{
                  borderColor: 'var(--color-border-strong)',
                  color: 'var(--color-text)',
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border-strong)'}
              />
            </div>
          )}

          {/* STEP 2 — scan */}
          {step === 2 && (
            <div className="animate-fadeIn space-y-6">
              <div>
                <p
                  className="text-[10.5px] tracking-[0.18em] uppercase font-mono mb-3"
                  style={{ color: 'var(--color-accent)' }}
                >
                  Próximo
                </p>
                <h2
                  className="font-display font-semibold text-[42px] sm:text-[54px] leading-[1.05] tracking-tight mb-3"
                  style={{ color: 'var(--color-text)' }}
                >
                  {name ? `Prazer, ${name}.` : 'Vamos lá.'}
                </h2>
                <p
                  className="font-sans text-[18px] leading-relaxed max-w-md"
                  style={{ color: 'var(--color-text-soft)' }}
                >
                  Checando sua base de conhecimento.
                  <button
                    onClick={() => setShowIndexInfo(true)}
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full ml-2 align-middle transition-colors"
                    style={{
                      border: '1px solid var(--color-border-strong)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    <Info className="w-3 h-3" />
                  </button>
                </p>
              </div>

              <div
                className="rounded-[18px] p-5"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {scanPhase === 'scanning' && (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                      <span
                        className="text-[13px] font-medium"
                        style={{ color: 'var(--color-text)' }}
                      >
                        Pesquisa em andamento
                      </span>
                    </div>
                    <p className="text-[12px] mb-4 font-mono" style={{ color: 'var(--color-text-muted)' }}>
                      {scanTick === 0 && 'lendo status local...'}
                      {scanTick === 1 && 'validando chunks indexados...'}
                      {scanTick === 2 && 'conferindo consistência...'}
                      {scanTick >= 3 && 'finalizando...'}
                    </p>
                    <div
                      className="h-1 rounded-full overflow-hidden"
                      style={{ background: 'var(--color-surface-2)' }}
                    >
                      <div
                        className="h-full transition-all duration-300 rounded-full"
                        style={{
                          width: `${Math.min(100, (scanTick + 1) * 25)}%`,
                          background: 'var(--color-accent)',
                        }}
                      />
                    </div>
                  </>
                )}

                {scanPhase === 'done' && (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                      <span
                        className="text-[13px] font-medium"
                        style={{ color: 'var(--color-text)' }}
                      >
                        Status da base
                      </span>
                    </div>
                    {docsCount != null && docsCount > 0 ? (
                      <div
                        className="flex items-center gap-2 text-[14px]"
                        style={{ color: 'var(--color-accent-deep)' }}
                      >
                        <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                        <span>
                          {docsCount.toLocaleString('pt-BR')} chunks indexados — pronto para uso.
                        </span>
                      </div>
                    ) : (
                      <div
                        className="flex items-start gap-2 text-[14px]"
                        style={{ color: 'var(--color-text-soft)' }}
                      >
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--color-accent)' }} />
                        <span>Sem chunks ainda. Você pode indexar depois nas configurações.</span>
                      </div>
                    )}
                    <button
                      onClick={refreshDocsStatus}
                      disabled={checkingDocs}
                      className="mt-3 rounded-md px-3 py-1.5 text-[11px] font-mono transition-colors disabled:opacity-50"
                      style={{
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-soft)',
                      }}
                    >
                      {checkingDocs ? 'verificando...' : 'verificar de novo'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 3 — provider */}
          {step === 3 && (
            <div className="animate-fadeIn space-y-6">
              <div>
                <p
                  className="text-[10.5px] tracking-[0.18em] uppercase font-mono mb-3"
                  style={{ color: 'var(--color-accent)' }}
                >
                  Quase lá
                </p>
                <h2
                  className="font-display font-semibold text-[42px] sm:text-[54px] leading-[1.05] tracking-tight mb-3"
                  style={{ color: 'var(--color-text)' }}
                >
                  Escolha o modelo.
                </h2>
                <p
                  className="font-sans text-[18px] leading-relaxed max-w-md"
                  style={{ color: 'var(--color-text-soft)' }}
                >
                  Qual inteligência vai conversar com você?
                </p>
              </div>

              <div className="space-y-2.5">
                {visibleProviders.map(item => {
                  const active = provider === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setProvider(item.id)}
                      className="w-full rounded-[14px] p-4 text-left transition-all duration-200 flex items-center gap-3"
                      style={{
                        background: active ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                        border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: active ? 'var(--color-surface)' : 'var(--color-surface-2)',
                        }}
                      >
                        <ProviderIcon provider={item.id} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[14px] font-medium"
                            style={{ color: active ? 'var(--color-accent-deep)' : 'var(--color-text)' }}
                          >
                            {item.label}
                          </span>
                          {hasKeys[item.id] && (
                            <span
                              className="text-[9.5px] tracking-wider uppercase font-mono px-1.5 py-0.5 rounded-full"
                              style={{
                                background: 'var(--color-surface-2)',
                                color: 'var(--color-text-soft)',
                              }}
                            >
                              pronto
                            </span>
                          )}
                        </div>
                        <p
                          className="text-[12px] mt-0.5 leading-snug"
                          style={{ color: 'var(--color-text-soft)' }}
                        >
                          {item.description}
                        </p>
                      </div>
                      {active && (
                        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--color-accent)' }} />
                      )}
                    </button>
                  )
                })}
              </div>
              {error && (
                <p className="text-[13px] font-mono" style={{ color: 'var(--color-text-soft)' }}>
                  {error}
                </p>
              )}
            </div>
          )}

          {/* STEP 4 — final */}
          {step === 4 && (
            <div className="animate-fadeIn space-y-6">
              <div>
                <p
                  className="text-[10.5px] tracking-[0.18em] uppercase font-mono mb-3"
                  style={{ color: 'var(--color-accent)' }}
                >
                  Pronto
                </p>
                <h2
                  className="font-display font-semibold text-[42px] sm:text-[54px] leading-[1.05] tracking-tight"
                  style={{ color: 'var(--color-text)' }}
                >
                  {docsCount && docsCount > 0 ? 'Tudo certo.' : 'Quase lá.'}
                </h2>
              </div>

              <div
                className="rounded-[18px] p-5 space-y-3"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {([
                  { label: `Nome: ${name}`, status: 'ok' as const },
                  { label: `Modelo: ${PROVIDERS.find(p => p.id === provider)?.label}`, status: 'ok' as const },
                  { label: 'Indexação', status: (docsCount && docsCount > 0 ? 'ok' : 'pendente') as 'ok' | 'pendente' },
                ]).map(({ label, status }, index) => {
                  const done = finalChecklistProgress >= index + 1
                  if (!done) return (
                    <div key={label} className="flex items-center gap-2 py-1">
                      <div className="w-3.5 h-3.5 rounded-full animate-pulse" style={{ background: 'var(--color-surface-2)' }} />
                      <div className="h-3 rounded animate-pulse" style={{ background: 'var(--color-surface-2)', width: `${100 + index * 30}px` }} />
                    </div>
                  )
                  const isOk = status === 'ok'
                  return (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[13.5px]" style={{ color: 'var(--color-text)' }}>
                        {isOk
                          ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--color-accent)' }} />
                          : <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--color-accent)' }} />
                        }
                        {label}
                      </div>
                      <span
                        className="text-[10px] tracking-wider font-mono uppercase px-1.5 py-0.5 rounded-full"
                        style={{
                          background: 'var(--color-surface-2)',
                          color: 'var(--color-text-soft)',
                        }}
                      >
                        {isOk ? 'ok' : 'depois'}
                      </span>
                    </div>
                  )
                })}
              </div>

              {finalChecklistProgress >= 3 && (
                <p
                  className="font-sans text-[18px] leading-relaxed max-w-md animate-fadeIn"
                  style={{ color: 'var(--color-text-soft)' }}
                >
                  {docsCount && docsCount > 0
                    ? 'Você pode começar a usar a Nixa agora.'
                    : 'Indexe a documentação depois em Configurações → Indexar para respostas mais precisas.'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="mt-10 pt-6 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
            onClick={handleBack}
            disabled={savingProvider || isTyping}
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-mono transition-colors disabled:opacity-40"
            style={{
              color: 'var(--color-text-soft)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            voltar
          </button>

          <button
            onClick={handleContinue}
            disabled={
              (step === 1 && !name.trim()) ||
              savingProvider || isTyping ||
              (step === 4 && finalChecklistProgress < 3)
            }
            className="group flex items-center gap-2 rounded-full px-6 py-2.5 text-[13px] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'var(--color-accent)',
              color: '#FFFFFF',
            }}
          >
            {step === 4
              ? finalChecklistProgress < 3 ? 'finalizando…' : 'Começar a usar'
              : step === 3 && savingProvider
              ? 'salvando…'
              : isTyping
              ? 'aguarde…'
              : 'Continuar'}
            {!(step === 4 && finalChecklistProgress < 3) && !savingProvider && !isTyping && (
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Info modal */}
      {showIndexInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md p-4"
          style={{ background: 'rgba(15, 14, 12, 0.45)' }}
        >
          <div
            className="w-full max-w-md rounded-[22px] overflow-hidden animate-fadeIn"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 24px 60px -12px rgba(15,14,12,0.4)',
            }}
          >
            <div
              className="px-6 py-5"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <h3
                className="font-display text-[26px]"
                style={{ color: 'var(--color-text)' }}
              >
                O que é indexação?
              </h3>
            </div>
            <div className="px-6 py-5 text-[13.5px] space-y-3 leading-relaxed" style={{ color: 'var(--color-text-soft)' }}>
              <p>Indexação é o processo de ler as documentações NICE/CXone, quebrar em partes menores e salvar numa base de busca vetorial.</p>
              <p>Assim, quando você pergunta algo, a Nixa encontra trechos relevantes e responde com precisão sobre os produtos NICE.</p>
              <p>Pode usar sem indexar, mas a qualidade das respostas melhora bastante depois.</p>
            </div>
            <div
              className="px-6 py-4 flex justify-end"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <button
                onClick={() => setShowIndexInfo(false)}
                className="rounded-full px-4 py-2 text-[12.5px] font-medium transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-accent)', color: '#FFFFFF' }}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
