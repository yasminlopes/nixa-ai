'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, BookOpen, Settings, User, Layers } from 'lucide-react'
import { ThemeToggle } from '@/shared/components/theme-toggle'
import { ProfileTab } from './components/profile-tab'
import { IndexTab } from './components/index-tab'
import { SettingsTab } from './components/settings-tab'
import { AboutTab } from './components/about-tab'

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
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md p-4"
      style={{ background: 'rgba(15, 14, 12, 0.4)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) handleRequestClose() }}
    >
      <div
        className="w-full max-w-6xl h-[90vh] overflow-hidden rounded-[22px]"
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 32px 80px -16px rgba(15,14,12,0.45)',
        }}
      >
        <div className="h-full grid grid-cols-1 md:grid-cols-[260px_1fr]">

          {/* Nav sidebar */}
          <aside
            className="p-4 flex flex-col"
            style={{
              background: 'var(--color-surface-2)',
              borderRight: '1px solid var(--color-border)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-baseline gap-2">
                <span className="font-display font-semibold text-[18px] tracking-tight" style={{ color: 'var(--color-text)' }}>
                  Ajustes
                </span>
              </div>
              <button
                onClick={handleRequestClose}
                className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--color-hover)'
                  e.currentTarget.style.color = 'var(--color-text)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--color-text-muted)'
                }}
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="space-y-1 flex-1">
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
                    className="w-full flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] transition-colors"
                    style={{
                      background: active ? 'var(--color-surface)' : 'transparent',
                      color: active ? 'var(--color-text)' : 'var(--color-text-soft)',
                      boxShadow: active ? '0 0 0 1px var(--color-border)' : 'none',
                      opacity: locked ? 0.4 : 1,
                      cursor: locked ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={e => { if (!active && !locked) e.currentTarget.style.background = 'var(--color-surface)' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                  >
                    {active && (
                      <span className="w-[2px] self-stretch rounded-full" style={{ background: 'var(--color-accent)' }} />
                    )}
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {item.label}
                  </button>
                )
              })}
            </nav>

            <div
              className="mt-4 pt-4 px-1 flex items-center justify-between"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <span className="text-[10px] tracking-[0.18em] uppercase font-mono" style={{ color: 'var(--color-text-muted)' }}>
                Tema
              </span>
              <ThemeToggle />
            </div>
          </aside>

          {/* Content */}
          <section className="h-full overflow-y-auto p-8">
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
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(15, 14, 12, 0.4)' }}
          onMouseDown={e => { if (e.target === e.currentTarget) setShowCloseConfirm(false) }}
        >
          <div
            className="w-full max-w-md rounded-[18px] overflow-hidden"
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
              <h3 className="font-display font-semibold text-[22px] tracking-tight" style={{ color: 'var(--color-text)' }}>
                Interromper indexação?
              </h3>
            </div>
            <div className="px-6 py-4 text-[13.5px] leading-relaxed" style={{ color: 'var(--color-text-soft)' }}>
              A indexação está em andamento. Se fechar agora, o processo será interrompido.
            </div>
            <div
              className="px-6 py-4 flex justify-end gap-2"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="rounded-md px-4 py-2 text-[12.5px] transition-colors"
                style={{
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-soft)',
                }}
              >
                Continuar
              </button>
              <button
                onClick={() => { setShowCloseConfirm(false); onClose() }}
                className="rounded-md px-4 py-2 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-accent)' }}
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
