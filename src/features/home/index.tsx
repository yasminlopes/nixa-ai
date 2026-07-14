'use client'

import { ChatInterface } from '@/features/chat'
import { Sidebar } from '@/features/sidebar'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Conversation } from '@/shared/types'
import { PanelLeft, KeyRound, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { getKeyStatus } from '@/shared/utils/api-key-storage'
import styles from './index.module.scss'

type GateState = 'loading' | 'key' | 'index' | 'done'

export function HomeView() {
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
      const status = getKeyStatus()
      const hasAnyKey = status.gemini || status.openai || status.ollama
      if (!hasAnyKey) { setGateState('key'); return }

      const docsRes = await fetch('/api/index-docs')
      const docs = await docsRes.json() as { count: number }
      if ((docs.count ?? 0) === 0) { setGateState('index'); return }
      setGateState('done')
    } catch {
      setGateState('done')
    }
  }

  useEffect(() => {
    if (!checkedOnboarding) return
    checkGate()
  }, [checkedOnboarding])

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

  if (!checkedOnboarding) return <div className={styles.loadingScreen} />

  const showGate = gateState === 'key' || gateState === 'index'

  return (
    <div className={styles.root}>
      {mobileSidebarOpen && (
        <button
          className={styles.mobileOverlay}
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Fechar menu lateral"
        />
      )}

      <div className={clsx(styles.sidebarWrap, !mobileSidebarOpen && styles.sidebarWrapClosed)}>
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

      <main className={styles.main}>
        <div className={styles.mobileHeader}>
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className={styles.mobileMenuButton}
            title="Abrir menu"
          >
            <PanelLeft size={16} />
          </button>
          <span className={styles.mobileTitle}>Nixa</span>
        </div>
        <ChatInterface
          key={`${activeConversationId ?? 'new'}-${chatKey}`}
          conversationId={activeConversationId}
          onConversationSaved={handleConversationSaved}
        />
      </main>

      {showGate && (
        <div className={styles.gateOverlay}>
          <div className={styles.gateInner}>

            <div className={styles.gateSteps}>
              <span style={{ opacity: gateState === 'key' ? 1 : 0.5 }}>
                {gateState === 'key' ? '01' : '✓'} Chave
              </span>
              <span style={{ opacity: 0.3 }}>·</span>
              <span style={{ opacity: gateState === 'index' ? 1 : 0.4 }}>
                02 Indexar
              </span>
            </div>

            {gateState === 'key' && (
              <button onClick={() => openModal('settings')} className={styles.gateCard}>
                <div className={styles.gateCardBody}>
                  <div className={styles.gateCardHead}>
                    <p className={styles.gateEyebrow}>Primeiro passo</p>
                    <h2 className={styles.gateTitle}>Adicione sua chave.</h2>
                    <p className={styles.gateDesc}>
                      Gemini (gratuita), OpenAI ou Ollama (local, sem custo) para gerar embeddings e respostas.
                    </p>
                  </div>

                  <div className={styles.gateNotice}>
                    <ShieldCheck className={styles.gateNoticeIcon} />
                    <p className={styles.gateNoticeText}>
                      Criptografada com{' '}
                      <span className={styles.gateNoticeStrong}>AES-256-GCM</span>.
                      Nunca exposta nas respostas.
                    </p>
                  </div>

                  <div className={styles.gateFooter}>
                    <div className={styles.gateHint}>
                      <KeyRound size={12} />
                      Gemini é gratuito
                    </div>
                    <div className={styles.gateCta}>
                      Configurar
                      <ArrowRight size={12} />
                    </div>
                  </div>
                </div>
              </button>
            )}

            {gateState === 'index' && (
              <button onClick={() => openModal('index')} className={styles.gateCard}>
                <div className={styles.gateCardBody}>
                  <div className={styles.gateCardHead}>
                    <p className={styles.gateEyebrow}>Quase lá</p>
                    <h2 className={styles.gateTitle}>Indexe a documentação.</h2>
                    <p className={styles.gateDesc}>
                      Chave configurada. Agora a Nixa precisa absorver as docs NICE/CXone para começar a responder.
                    </p>
                  </div>

                  <div className={styles.gateNotice}>
                    <ShieldCheck className={styles.gateNoticeIcon} />
                    <p className={styles.gateNoticeText}>
                      URLs já indexadas são puladas — sem reprocessar o que já existe.
                    </p>
                  </div>

                  <div className={styles.gateFooter}>
                    <span className={styles.gateHint}>pode levar alguns minutos</span>
                    <div className={styles.gateCta}>
                      <Sparkles size={12} />
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
