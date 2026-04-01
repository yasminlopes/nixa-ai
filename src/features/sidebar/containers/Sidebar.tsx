'use client'
import { useEffect, useState } from 'react'
import {
  MessageSquare,
  Plus,
  Trash2,
  User,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Zap,
  MessageCircle,
  HelpCircle,
  Brain,
  Lightbulb,
} from 'lucide-react'
import { Conversation } from '@/shared/types'
import { cn } from '@/shared/utils/cn'
import { WorkspaceModal, WorkspaceTab } from '@/features/settings/containers/WorkspaceModal'

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
  const [userName, setUserName] = useState('Usuário')
  const [userAvatar, setUserAvatar] = useState<string | null>(null)

  const [showNixaLogo, setShowNixaLogo] = useState(true)

  useEffect(() => {
    loadConversations()
  }, [refreshTrigger])

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
    } catch {
      // ignore
    }
  }

  function loadProfile() {
    const name = localStorage.getItem('nixa-user-name')?.trim() || 'Usuário'
    const avatar = localStorage.getItem('nixa-user-avatar')?.trim() || null
    setUserName(name)
    setUserAvatar(avatar)
  }

  function deleteConversation(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const updated = conversations.filter(c => c.id !== id)
    setConversations(updated)
    localStorage.setItem('nixa-conversations', JSON.stringify(updated))
    if (activeId === id) {
      onNewChat()
      onCloseMobile?.()
    }
  }

  function handleSelectConversation(id: string) {
    onSelectConversation(id)
    onCloseMobile?.()
  }

  function handleNewChat() {
    onNewChat()
    onCloseMobile?.()
  }

  function openWorkspaceTab(tab: WorkspaceTab) {
    setWorkspaceTab(tab)
    setShowWorkspaceModal(true)
    onCloseMobile?.()
  }

  const grouped = groupByDate(conversations)

  // Função para pegar ícone baseado no título da conversa
  function getConversationIcon(title: string) {
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes('dúvida') || lowerTitle.includes('pergunta') || lowerTitle.includes('?')) {
      return <HelpCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-70" />
    }
    if (lowerTitle.includes('ideia') || lowerTitle.includes('sugest')) {
      return <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-70" />
    }
    if (lowerTitle.includes('análise') || lowerTitle.includes('analizar')) {
      return <Brain className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-70" />
    }
    return <MessageCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-70" />
  }

  return (
    <>
      <aside
        className={cn(
          'h-full bg-[#17223d] text-[#d4e0f3] flex flex-col shrink-0 transition-all duration-200 shadow-xl md:shadow-none',
          collapsed ? 'w-[78px]' : 'w-[260px]'
        )}
      >
        <div className="px-4 pt-5 pb-3">
          {/* Header: Logo + Collapse button */}
          <div className="flex items-center justify-between mb-4">
            {/* Logo and text - hidden when collapsed */}
            {!collapsed && (
              <div className="flex items-center gap-3 animate-fadeIn">
                <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-[#4f7a96] to-[#4cacc7] flex items-center justify-center shadow-lg animate-glow hover:animate-pulse-soft transition-all overflow-hidden">
                  {showNixaLogo ? (
                    <img 
                      src="/assets/nixa.png" 
                      alt="Nixa" 
                      className="w-6 h-6 object-contain"
                      onError={() => setShowNixaLogo(false)}
                    />
                  ) : (
                    <Zap className="w-5 h-5 text-white animate-pulse-soft" />
                  )}
                </div>
                <span className="font-bold text-[#fdfefe] tracking-tight text-base bg-gradient-to-r from-[#4f7a96] to-[#4cacc7] bg-clip-text text-transparent">
                  Nixa AI
                </span>
              </div>
            )}

            {/* Collapse button */}
            <button
              onClick={onToggleCollapse}
              className={cn(
                'hidden md:flex items-center justify-center rounded-md text-[#d4e0f3] hover:bg-[#425f83] transition-all duration-200 hover:scale-110',
                collapsed ? 'w-8 h-8' : 'w-7 h-7 ml-auto'
              )}
              title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            >
              {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>

            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-[#d4e0f3] hover:bg-[#425f83] transition-colors"
              title="Fechar menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleNewChat}
            className={cn(
              'w-full flex items-center rounded-lg text-sm bg-gradient-to-r from-[#425f83] to-[#4f7a96] hover:from-[#4f7a96] hover:to-[#4cacc7] text-[#fdfefe] transition-all duration-200 border border-[#94a6b8]/30 hover:border-[#4cacc7]/50 group shadow-md hover:shadow-lg',
              collapsed ? 'justify-center px-2 py-2.5' : 'gap-2 px-3 py-2'
            )}
            title="Novo chat"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
            {!collapsed && 'Novo chat'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-1">
          {collapsed ? (
            <div className="flex flex-col items-center gap-1.5">
              {conversations.slice(0, 12).map((conv, idx) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 animate-fadeIn',
                    activeId === conv.id
                      ? 'bg-gradient-to-br from-[#4f7a96] to-[#4cacc7] text-[#fdfefe] shadow-lg'
                      : 'text-[#d4e0f3] hover:bg-[#425f83] hover:text-[#fdfefe]'
                  )}
                  title={conv.title}
                >
                  {getConversationIcon(conv.title)}
                </button>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-[#94a6b8] text-center mt-8 px-4 animate-fadeIn">
              Suas conversas vao aparecer aqui
            </p>
          ) : (
            Object.entries(grouped).map(([group, convs]) => (
              <div key={group} className="mb-4 animate-fadeIn">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#94a6b8] px-2 mb-1">
                  {group}
                </p>
                {convs.map((conv, idx) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    style={{ animationDelay: `${idx * 0.05}s` }}
                    className={cn(
                      'w-full flex items-start gap-2 px-2 py-2.5 rounded-lg text-left group',
                      'text-sm transition-all duration-200 hover:scale-105 hover:pl-3 animate-fadeIn',
                      activeId === conv.id
                        ? 'bg-gradient-to-r from-[#4f7a96] to-[#4cacc7] text-[#fdfefe] shadow-md'
                        : 'text-[#d4e0f3] hover:bg-[#425f83]/50 hover:text-[#fdfefe]'
                    )}
                  >
                    {getConversationIcon(conv.title)}
                    <span className="flex-1 truncate leading-snug">{conv.title}</span>
                    <Trash2
                      className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity mt-0.5 hover:text-red-400"
                      onClick={e => deleteConversation(e, conv.id)}
                    />
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        <div className={cn('px-2 pb-4 pt-2 border-t border-[#94a6b8]/25', collapsed ? 'space-y-2' : 'space-y-1')}>
          <button
            onClick={() => openWorkspaceTab('profile')}
            className={cn(
              'w-full rounded-lg text-sm text-[#d4e0f3] hover:bg-[#425f83] hover:text-[#fdfefe] transition-colors',
              collapsed ? 'px-2 py-2.5' : 'px-3 py-2'
            )}
            title="Configurações"
          >
            {collapsed ? (
              <div className="flex justify-center">
                {userAvatar ? (
                  <img src={userAvatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-[#94a6b8]" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#4f7a96] text-white flex items-center justify-center text-xs font-semibold">
                    {userName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {userAvatar ? (
                  <img src={userAvatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-[#94a6b8]" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#4f7a96] text-white flex items-center justify-center text-xs font-semibold">
                    {userName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{userName}</p>
                  <p className="text-[11px] text-[#94a6b8]">Configurações</p>
                </div>
                <User className="w-4 h-4 opacity-70" />
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
