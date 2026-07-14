'use client'
import { useEffect, useState } from 'react'
import {
  Plus,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Settings as SettingsIcon,
  MessageSquare,
} from 'lucide-react'
import { Conversation } from '@/shared/types'
import { cn } from '@/shared/utils/cn'
import { WorkspaceModal, WorkspaceTab } from '@/features/settings'

interface SidebarProps {
  activeId: string | null
  refreshTrigger: number
  onSelectConversation: (id: string) => void
  onNewChat: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  onCloseMobile?: () => void
}

export function Sidebar({
  activeId,
  refreshTrigger,
  onSelectConversation,
  onNewChat,
  collapsed = false,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false)
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('index')
  const [userName, setUserName] = useState('Você')
  const [userAvatar, setUserAvatar] = useState<string | null>(null)

  useEffect(() => { loadConversations() }, [refreshTrigger])

  useEffect(() => {
    loadProfile()
    const handleProfileUpdate = () => loadProfile()
    window.addEventListener('nixa-profile-updated', handleProfileUpdate)

    const handleOpenWorkspace = (e: Event) => {
      const tab = (e as CustomEvent<{ tab: WorkspaceTab }>).detail?.tab ?? 'index'
      setWorkspaceTab(tab)
      setShowWorkspaceModal(true)
    }
    window.addEventListener('nixa-open-workspace', handleOpenWorkspace)

    return () => {
      window.removeEventListener('nixa-profile-updated', handleProfileUpdate)
      window.removeEventListener('nixa-open-workspace', handleOpenWorkspace)
    }
  }, [])

  function loadConversations() {
    try {
      const stored = localStorage.getItem('nixa-conversations')
      if (!stored) return
      const parsed: Conversation[] = JSON.parse(stored)
      setConversations(
        parsed
          .map(c => ({ ...c, createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt) }))
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      )
    } catch { /* ignore */ }
  }

  function loadProfile() {
    const name = localStorage.getItem('nixa-user-name')?.trim() || 'Você'
    const avatar = localStorage.getItem('nixa-user-avatar')?.trim() || null
    setUserName(name)
    setUserAvatar(avatar)
  }

  function deleteConversation(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const updated = conversations.filter(c => c.id !== id)
    setConversations(updated)
    localStorage.setItem('nixa-conversations', JSON.stringify(updated))
    if (activeId === id) { onNewChat(); onCloseMobile?.() }
  }

  function handleSelectConversation(id: string) { onSelectConversation(id); onCloseMobile?.() }
  function handleNewChat() { onNewChat(); onCloseMobile?.() }
  function openWorkspaceTab(tab: WorkspaceTab) {
    setWorkspaceTab(tab); setShowWorkspaceModal(true); onCloseMobile?.()
  }

  const grouped = groupByDate(conversations)

  return (
    <>
      <aside
        className={cn(
          'h-full flex flex-col shrink-0 transition-all duration-200',
          collapsed ? 'w-[68px]' : 'w-[280px]'
        )}
        style={{
          background: 'var(--color-bg)',
        }}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center justify-between mb-5">
            {!collapsed && (
              <div className="flex items-center gap-2.5 animate-fadeIn">
                <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0"
                     style={{ background: 'linear-gradient(135deg, #4F7AFF 0%, #A78BFA 100%)' }}>
                  <video
                    src="/assets/nixa-video.mp4"
                    autoPlay muted loop playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
                <span
                  className="font-display font-semibold text-[18px] tracking-tight"
                  style={{ color: 'var(--color-text)' }}
                >
                  Nixa
                </span>
              </div>
            )}

            <button
              onClick={onToggleCollapse}
              className={cn(
                'hidden md:flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                collapsed && 'mx-auto'
              )}
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--color-hover)'
                e.currentTarget.style.color = 'var(--color-text)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--color-text-muted)'
              }}
              title={collapsed ? 'Expandir' : 'Colapsar'}
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>

            <button
              onClick={onCloseMobile}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* New chat — pill preto */}
          <button
            onClick={handleNewChat}
            className={cn(
              'w-full flex items-center rounded-2xl text-[13px] font-medium transition-all hover:opacity-90 active:scale-[0.98]',
              collapsed ? 'justify-center px-2 py-2.5' : 'gap-2 px-3.5 py-2.5'
            )}
            style={{
              background: 'var(--color-ink)',
              color: 'var(--color-ink-text)',
            }}
            title="Nova conversa"
          >
            <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} />
            {!collapsed && 'Nova conversa'}
          </button>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2">
          {collapsed ? (
            <div className="flex flex-col items-center gap-1">
              {conversations.slice(0, 10).map(conv => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors"
                  style={{
                    background: activeId === conv.id ? 'var(--color-accent-soft)' : 'transparent',
                    color: activeId === conv.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  }}
                  onMouseEnter={e => { if (activeId !== conv.id) e.currentTarget.style.background = 'var(--color-hover)' }}
                  onMouseLeave={e => { if (activeId !== conv.id) e.currentTarget.style.background = 'transparent' }}
                  title={conv.title}
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-3 mt-10 text-center">
              <p
                className="text-[12.5px] leading-relaxed"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Suas conversas vão aparecer aqui.
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([group, convs]) => (
              <div key={group} className="mb-5">
                <p
                  className="text-[10.5px] font-medium uppercase tracking-[0.1em] px-3 mb-1.5"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {group}
                </p>
                {convs.map(conv => {
                  const active = activeId === conv.id
                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left group transition-colors"
                      style={{
                        background: active ? 'var(--color-surface)' : 'transparent',
                        color: active ? 'var(--color-text)' : 'var(--color-text-soft)',
                        boxShadow: active ? '0 1px 3px rgba(15,16,20,0.04)' : 'none',
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--color-surface)' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                    >
                      <MessageSquare
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: active ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                      />
                      <span className="flex-1 truncate text-[13px] leading-snug">
                        {conv.title}
                      </span>
                      <Trash2
                        className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity"
                        style={{ color: 'var(--color-text-muted)' }}
                        onClick={e => deleteConversation(e, conv.id)}
                      />
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer — user pill */}
        <div className="px-3 pb-3 pt-2">
          <button
            onClick={() => openWorkspaceTab('profile')}
            className={cn(
              'w-full rounded-2xl text-sm transition-colors',
              collapsed ? 'px-2 py-2' : 'px-2 py-2'
            )}
            style={{ background: 'var(--color-surface)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--color-surface)'}
            title="Configurações"
          >
            {collapsed ? (
              <div className="flex justify-center">
                {userAvatar ? (
                  <img src={userAvatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-medium"
                    style={{ background: 'var(--color-ink)', color: 'var(--color-ink-text)' }}
                  >
                    {userName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                {userAvatar ? (
                  <img src={userAvatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-medium shrink-0"
                    style={{ background: 'var(--color-ink)', color: 'var(--color-ink-text)' }}
                  >
                    {userName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 text-left min-w-0">
                  <p
                    className="text-[13px] font-semibold truncate"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {userName}
                  </p>
                  <p
                    className="text-[11px] tracking-wide"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Configurações
                  </p>
                </div>
                <SettingsIcon
                  className="w-4 h-4 shrink-0"
                  style={{ color: 'var(--color-text-muted)' }}
                />
              </div>
            )}
          </button>
        </div>
      </aside>

      {showWorkspaceModal && (
        <WorkspaceModal
          initialTab={workspaceTab}
          onClose={() => {
            setShowWorkspaceModal(false)
            window.dispatchEvent(new CustomEvent('nixa-modal-closed'))
          }}
        />
      )}
    </>
  )
}

function groupByDate(conversations: Conversation[]): Record<string, Conversation[]> {
  const now = new Date()
  const today = now.toDateString()
  const yesterdayDate = new Date(now)
  yesterdayDate.setDate(now.getDate() - 1)
  const yesterday = yesterdayDate.toDateString()
  const groups: Record<string, Conversation[]> = {}
  for (const conv of conversations) {
    const d = new Date(conv.updatedAt).toDateString()
    const label = d === today ? 'Hoje' : d === yesterday ? 'Ontem' : 'Anteriores'
    if (!groups[label]) groups[label] = []
    groups[label].push(conv)
  }
  return groups
}
