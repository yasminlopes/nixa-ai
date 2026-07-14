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
import clsx from 'clsx'
import { ProviderIcon } from '@/shared/components/provider-icon'
import { useIsHosted } from '@/shared/hooks/use-is-hosted'
import { getStoredProvider, saveStoredProvider } from '@/shared/utils/llm-settings-storage'
import { getKeyStatus } from '@/shared/utils/api-key-storage'
import { type Provider } from '@/core/providers'
import styles from './index.module.scss'

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
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [scanPhase, setScanPhase] = useState<'idle' | 'scanning' | 'done'>('idle')
  const [scanTick, setScanTick] = useState(0)
  const [finalChecklistProgress, setFinalChecklistProgress] = useState(0)

  const nameInputRef = useRef<HTMLInputElement>(null)
  const isHosted = useIsHosted()
  const visibleProviders = isHosted ? PROVIDERS.filter(item => item.id !== 'ollama') : PROVIDERS

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

  function loadSettings() {
    setProvider(getStoredProvider() ?? 'gemini')
    setHasKeys(getKeyStatus())
  }

  function persistProviderSelection() {
    setError(null)
    try {
      saveStoredProvider(provider)
      return true
    } catch {
      setError('Falha ao salvar o modelo escolhido.')
      return false
    }
  }

  function wait(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)) }

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

  if (!ready) return <div className={styles.loadingScreen} />

  if (step === 0) {
    return (
      <main className={styles.welcomeMain}>
        <div className={styles.welcomeInner}>
          <p className={clsx(styles.eyebrow, 'animate-fadeIn')}>
            — uma assistente em NICE CXone
          </p>

          <div className={clsx(styles.logoRow, 'animate-fadeIn')} style={{ animationDelay: '0.05s' }}>
            <div className={clsx(styles.logoBox, 'nixa-glow')}>
              <video src="/assets/nixa-video.mp4" autoPlay muted loop playsInline className={styles.logoVideo} />
            </div>
          </div>

          <h1 className={clsx(styles.welcomeTitle, 'animate-fadeIn')} style={{ animationDelay: '0.1s' }}>
            Olá. Sou a{' '}
            <span className={styles.welcomeTitleAccent}>Nixa</span>.
          </h1>

          <p className={clsx(styles.welcomeSubtitle, 'animate-fadeIn')} style={{ animationDelay: '0.2s' }}>
            Vou te guiar numa configuração rápida para começarmos a trabalhar juntos.
          </p>

          <div className="animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            <button onClick={handleContinue} disabled={isTyping} className={styles.ctaButton}>
              {isTyping ? 'Um momento…' : 'Começar'}
              <ArrowRight className={clsx('w-4 h-4', styles.arrowIcon)} />
            </button>
            <p className={styles.ctaHint}>leva menos de 2 minutos</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.progressRow}>
          <div className={styles.progressLeft}>
            <span className={styles.brandName}>Nixa</span>
            <span className={styles.brandStatus}>configurando</span>
          </div>
          <div className={styles.progressDots}>
            {STEPS.slice(1).map((_, i) => {
              const idx = i + 1
              return (
                <div
                  key={idx}
                  className={styles.progressDot}
                  style={{
                    width: idx === step ? 20 : 5,
                    background: idx <= step ? 'var(--color-accent)' : 'var(--color-border-strong)',
                  }}
                />
              )
            })}
          </div>
        </div>

        <div className={styles.stepContent}>
          {step === 1 && (
            <div className={styles.stepBlock}>
              <div>
                <p className={styles.stepEyebrow}>Primeiro</p>
                <h2 className={styles.stepTitle}>Como posso te chamar?</h2>
              </div>
              <input
                ref={nameInputRef}
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleContinue() }}
                placeholder="Seu nome"
                className={styles.nameInput}
              />
            </div>
          )}

          {step === 2 && (
            <div className={styles.stepBlock}>
              <div>
                <p className={styles.stepEyebrow}>Próximo</p>
                <h2 className={styles.stepTitle} style={{ marginBottom: 12 }}>
                  {name ? `Prazer, ${name}.` : 'Vamos lá.'}
                </h2>
                <p className={styles.stepSubtitle}>
                  Checando sua base de conhecimento.
                  <button onClick={() => setShowIndexInfo(true)} className={styles.infoButton}>
                    <Info size={12} />
                  </button>
                </p>
              </div>

              <div className={styles.scanCard}>
                {scanPhase === 'scanning' && (
                  <>
                    <div className={styles.scanHeader}>
                      <Database size={16} style={{ color: 'var(--color-accent)' }} />
                      <span className={styles.scanHeaderText}>Pesquisa em andamento</span>
                    </div>
                    <p className={styles.scanStatusText}>
                      {scanTick === 0 && 'lendo status local...'}
                      {scanTick === 1 && 'validando chunks indexados...'}
                      {scanTick === 2 && 'conferindo consistência...'}
                      {scanTick >= 3 && 'finalizando...'}
                    </p>
                    <div className={styles.progressBarTrack}>
                      <div
                        className={styles.progressBarFill}
                        style={{ width: `${Math.min(100, (scanTick + 1) * 25)}%` }}
                      />
                    </div>
                  </>
                )}

                {scanPhase === 'done' && (
                  <>
                    <div className={styles.scanHeader}>
                      <Database size={16} style={{ color: 'var(--color-accent)' }} />
                      <span className={styles.scanHeaderText}>Status da base</span>
                    </div>
                    {docsCount != null && docsCount > 0 ? (
                      <div className={styles.scanResultRow}>
                        <CheckCircle2 size={16} style={{ color: 'var(--color-accent)' }} />
                        <span>{docsCount.toLocaleString('pt-BR')} chunks indexados — pronto para uso.</span>
                      </div>
                    ) : (
                      <div className={clsx(styles.scanResultRow, styles.scanResultRowMuted)}>
                        <AlertTriangle size={16} style={{ marginTop: 2, flexShrink: 0, color: 'var(--color-accent)' }} />
                        <span>Sem chunks ainda. Você pode indexar depois nas configurações.</span>
                      </div>
                    )}
                    <button onClick={refreshDocsStatus} disabled={checkingDocs} className={styles.recheckButton}>
                      {checkingDocs ? 'verificando...' : 'verificar de novo'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.stepBlock}>
              <div>
                <p className={styles.stepEyebrow}>Quase lá</p>
                <h2 className={styles.stepTitle} style={{ marginBottom: 12 }}>Escolha o modelo.</h2>
                <p className={styles.stepSubtitle}>Qual inteligência vai conversar com você?</p>
              </div>

              <div className={styles.providerList}>
                {visibleProviders.map(item => {
                  const active = provider === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setProvider(item.id)}
                      className={clsx(styles.providerButton, active && styles.providerButtonActive)}
                    >
                      <div className={clsx(styles.providerIconWrap, active && styles.providerIconWrapActive)}>
                        <ProviderIcon provider={item.id} />
                      </div>
                      <div className={styles.providerBody}>
                        <div className={styles.providerLabelRow}>
                          <span className={clsx(styles.providerLabel, active && styles.providerLabelActive)}>
                            {item.label}
                          </span>
                          {hasKeys[item.id] && (
                            <span className={styles.providerReadyBadge}>pronto</span>
                          )}
                        </div>
                        <p className={styles.providerDesc}>{item.description}</p>
                      </div>
                      {active && <CheckCircle2 className={styles.providerCheck} />}
                    </button>
                  )
                })}
              </div>
              {error && <p className={styles.errorText}>{error}</p>}
            </div>
          )}

          {step === 4 && (
            <div className={styles.stepBlock}>
              <div>
                <p className={styles.stepEyebrow}>Pronto</p>
                <h2 className={styles.stepTitle}>
                  {docsCount && docsCount > 0 ? 'Tudo certo.' : 'Quase lá.'}
                </h2>
              </div>

              <div className={styles.checklistCard}>
                {([
                  { label: `Nome: ${name}`, status: 'ok' as const },
                  { label: `Modelo: ${PROVIDERS.find(item => item.id === provider)?.label}`, status: 'ok' as const },
                  { label: 'Indexação', status: (docsCount && docsCount > 0 ? 'ok' : 'pendente') as 'ok' | 'pendente' },
                ]).map(({ label, status }, index) => {
                  const done = finalChecklistProgress >= index + 1
                  if (!done) return (
                    <div key={label} className={styles.skeletonRow}>
                      <div className={styles.skeletonDot} />
                      <div className={styles.skeletonBar} style={{ width: `${100 + index * 30}px` }} />
                    </div>
                  )
                  const isOk = status === 'ok'
                  return (
                    <div key={label} className={styles.checklistRow}>
                      <div className={styles.checklistLeft}>
                        {isOk
                          ? <CheckCircle2 className={styles.checklistIcon} />
                          : <AlertTriangle className={styles.checklistIcon} />
                        }
                        {label}
                      </div>
                      <span className={styles.checklistBadge}>{isOk ? 'ok' : 'depois'}</span>
                    </div>
                  )
                })}
              </div>

              {finalChecklistProgress >= 3 && (
                <p className={styles.finalNote}>
                  {docsCount && docsCount > 0
                    ? 'Você pode começar a usar a Nixa agora.'
                    : 'Indexe a documentação depois em Configurações → Indexar para respostas mais precisas.'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button onClick={handleBack} disabled={isTyping} className={styles.backButton}>
            <ChevronLeft size={14} />
            voltar
          </button>

          <button
            onClick={handleContinue}
            disabled={
              (step === 1 && !name.trim()) ||
              isTyping ||
              (step === 4 && finalChecklistProgress < 3)
            }
            className={styles.continueButton}
          >
            {step === 4
              ? finalChecklistProgress < 3 ? 'finalizando…' : 'Começar a usar'
              : isTyping
              ? 'aguarde…'
              : 'Continuar'}
            {!(step === 4 && finalChecklistProgress < 3) && !isTyping && (
              <ArrowRight className={clsx('w-3.5 h-3.5', styles.arrowIcon)} />
            )}
          </button>
        </div>
      </div>

      {/* Info modal */}
      {showIndexInfo && (
        <div className={styles.infoOverlay}>
          <div className={styles.infoModal}>
            <div className={styles.infoHeader}>
              <h3 className={styles.infoTitle}>O que é indexação?</h3>
            </div>
            <div className={styles.infoBody}>
              <p>Indexação é o processo de ler as documentações NICE/CXone, quebrar em partes menores e salvar numa base de busca vetorial.</p>
              <p>Assim, quando você pergunta algo, a Nixa encontra trechos relevantes e responde com precisão sobre os produtos NICE.</p>
              <p>Pode usar sem indexar, mas a qualidade das respostas melhora bastante depois.</p>
            </div>
            <div className={styles.infoFooter}>
              <button onClick={() => setShowIndexInfo(false)} className={styles.infoConfirmButton}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
