'use client'
import { useEffect, useState, type MouseEvent } from 'react'
import {
  Plus,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Settings as SettingsIcon,
  MessageSquare,
} from 'lucide-react'
import clsx from 'clsx'
import { Conversation } from '@/shared/types'
import { WorkspaceModal, WorkspaceTab } from '@/features/settings'
import styles from './index.module.scss'

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

  function deleteConversation(e: MouseEvent, id: string) {
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
      <aside className={clsx(styles.aside, collapsed ? styles.asideCollapsed : styles.asideExpanded)}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerRow}>
            {!collapsed && (
              <div className={clsx(styles.logo, 'animate-fadeIn')}>
                <div className={styles.logoIcon}>
                  <video
                    src="/assets/nixa-video.mp4"
                    autoPlay muted loop playsInline
                    className={styles.logoVideo}
                  />
                </div>
                <span className={styles.logoText}>Nixa</span>
              </div>
            )}

            <button
              onClick={onToggleCollapse}
              className={clsx(styles.iconButton, styles.collapseButton, collapsed && styles.collapseButtonCentered)}
              title={collapsed ? 'Expandir' : 'Colapsar'}
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>

            <button
              onClick={onCloseMobile}
              className={clsx(styles.iconButton, styles.mobileCloseButton)}
            >
              <X size={16} />
            </button>
          </div>

          {/* New chat — pill preto */}
          <button
            onClick={handleNewChat}
            className={clsx(
              styles.newChatButton,
              collapsed ? styles.newChatButtonCollapsed : styles.newChatButtonExpanded
            )}
            title="Nova conversa"
          >
            <Plus size={16} style={{ flexShrink: 0 }} strokeWidth={2.5} />
            {!collapsed && 'Nova conversa'}
          </button>
        </div>

        {/* Conversations */}
        <div className={styles.list}>
          {collapsed ? (
            <div className={styles.collapsedList}>
              {conversations.slice(0, 10).map(conv => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={clsx(styles.collapsedItem, activeId === conv.id && styles.collapsedItemActive)}
                  title={conv.title}
                >
                  <MessageSquare size={16} />
                </button>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateText}>
                Suas conversas vão aparecer aqui.
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([group, convs]) => (
              <div key={group} className={styles.group}>
                <p className={styles.groupLabel}>{group}</p>
                {convs.map(conv => {
                  const active = activeId === conv.id
                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={clsx(styles.item, active && styles.itemActive)}
                    >
                      <MessageSquare className={clsx(styles.itemIcon, active && styles.itemIconActive)} />
                      <span className={styles.itemTitle}>{conv.title}</span>
                      <Trash2
                        className={styles.itemDelete}
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
        <div className={styles.footer}>
          <button
            onClick={() => openWorkspaceTab('profile')}
            className={styles.footerButton}
            title="Configurações"
          >
            {collapsed ? (
              <div className={styles.footerCollapsed}>
                {userAvatar ? (
                  <img src={userAvatar} alt="" className={styles.footerAvatar} />
                ) : (
                  <div className={styles.footerAvatarFallback}>
                    {userName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.footerExpanded}>
                {userAvatar ? (
                  <img src={userAvatar} alt="" className={styles.footerAvatar} />
                ) : (
                  <div className={styles.footerAvatarFallback}>
                    {userName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className={styles.footerBody}>
                  <p className={styles.footerName}>{userName}</p>
                  <p className={styles.footerHint}>Configurações</p>
                </div>
                <SettingsIcon className={styles.footerSettingsIcon} />
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
