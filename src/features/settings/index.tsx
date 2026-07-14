'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, BookOpen, Settings, User, Layers } from 'lucide-react'
import clsx from 'clsx'
import { ThemeToggle } from '@/shared/components/theme-toggle'
import { ProfileTab } from './components/profile-tab'
import { IndexTab } from './components/index-tab'
import { SettingsTab } from './components/settings-tab'
import { AboutTab } from './components/about-tab'
import styles from './index.module.scss'

export type WorkspaceTab = 'profile' | 'index' | 'settings' | 'about'

const TABS: Array<{ id: WorkspaceTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'profile',  label: 'Perfil',        icon: User },
  { id: 'index',    label: 'Indexação',     icon: BookOpen },
  { id: 'settings', label: 'LLM e chaves',  icon: Settings },
  { id: 'about',    label: 'Sobre',         icon: Layers },
]

interface WorkspaceModalProps {
  initialTab: WorkspaceTab
  onClose: () => void
}

export function WorkspaceModal({ initialTab, onClose }: WorkspaceModalProps) {
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<WorkspaceTab>(initialTab)
  const [isIndexing, setIsIndexing] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  useEffect(() => { setMounted(true); return () => setMounted(false) }, [])
  useEffect(() => { setTab(initialTab) }, [initialTab])

  function handleRequestClose() {
    if (isIndexing) { setShowCloseConfirm(true); return }
    onClose()
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (showCloseConfirm) { setShowCloseConfirm(false); return }
      handleRequestClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  if (!mounted) return null

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={e => { if (e.target === e.currentTarget) handleRequestClose() }}
    >
      <div className={styles.modal}>
        <div className={styles.grid}>

          {/* Nav sidebar */}
          <aside className={styles.nav}>
            <div className={styles.navHeader}>
              <span className={styles.navTitle}>Ajustes</span>
              <button onClick={handleRequestClose} className={styles.closeButton} title="Fechar">
                <X size={16} />
              </button>
            </div>

            <nav className={styles.tabList}>
              {TABS.map(item => {
                const Icon = item.icon
                const active = tab === item.id
                const locked = isIndexing && item.id !== 'index'
                return (
                  <button
                    key={item.id}
                    onClick={() => !locked && setTab(item.id)}
                    disabled={locked}
                    title={locked ? 'Indisponível durante a indexação' : undefined}
                    className={clsx(styles.tabButton, active && styles.tabButtonActive, locked && styles.tabButtonLocked)}
                  >
                    {active && <span className={styles.tabIndicator} />}
                    <Icon className={styles.tabIcon} />
                    {item.label}
                  </button>
                )
              })}
            </nav>

            <div className={styles.themeRow}>
              <span className={styles.themeLabel}>Tema</span>
              <ThemeToggle />
            </div>
          </aside>

          {/* Content */}
          <section className={styles.content}>
            {tab === 'profile'  && <ProfileTab />}
            {tab === 'index'    && <IndexTab onRunningChange={setIsIndexing} />}
            {tab === 'settings' && <SettingsTab />}
            {tab === 'about'    && <AboutTab />}
          </section>
        </div>
      </div>

      {/* Close confirm */}
      {showCloseConfirm && (
        <div
          className={styles.confirmOverlay}
          onMouseDown={e => { if (e.target === e.currentTarget) setShowCloseConfirm(false) }}
        >
          <div className={styles.confirmModal}>
            <div className={styles.confirmHeader}>
              <h3 className={styles.confirmTitle}>Interromper indexação?</h3>
            </div>
            <div className={styles.confirmBody}>
              A indexação está em andamento. Se fechar agora, o processo será interrompido.
            </div>
            <div className={styles.confirmActions}>
              <button onClick={() => setShowCloseConfirm(false)} className={styles.confirmSecondary}>
                Continuar
              </button>
              <button
                onClick={() => { setShowCloseConfirm(false); onClose() }}
                className={styles.confirmPrimary}
              >
                Fechar mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}
