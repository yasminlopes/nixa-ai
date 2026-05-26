'use client'

import { useEffect, useState } from 'react'
import { Message as MessageType } from '@/shared/types'
import { cn } from '@/shared/utils/cn'
import { ChatBubble } from './ChatBubble'
import { Avatar } from '@/shared/components/Avatar'

interface MessageProps {
  message: MessageType
  isStreaming?: boolean
}

export function Message({ message, isStreaming }: MessageProps) {
  const isUser = message.role === 'user'
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [userName, setUserName] = useState('Y')

  useEffect(() => {
    if (!isUser) return
    setUserAvatar(localStorage.getItem('nixa-user-avatar')?.trim() || null)
    const n = localStorage.getItem('nixa-user-name')?.trim()
    if (n) setUserName(n.slice(0, 1).toUpperCase())
  }, [isUser])

  return (
    <div
      className={cn(
        'flex gap-3 w-full min-w-0 py-3 transition-all duration-300 ease-out',
        isUser ? 'justify-end animate-slideInFromRight' : 'animate-slideInFromLeft'
      )}
    >
      {!isUser && <Avatar variant="assistant" size="md" />}

      <div
        className={cn(
          'max-w-[82%] min-w-0',
          isUser ? 'flex flex-col items-end' : 'flex-1'
        )}
      >
        <ChatBubble
          content={message.content}
          sources={message.sources}
          variant={isUser ? 'user' : 'assistant'}
          isStreaming={isStreaming}
        />
      </div>

      {isUser && (
        <Avatar
          variant="user"
          src={userAvatar || undefined}
          fallback={userName}
          size="md"
        />
      )}
    </div>
  )
}
