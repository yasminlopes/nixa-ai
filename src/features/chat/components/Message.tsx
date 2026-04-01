'use client'

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
  const variant = isUser ? 'user' : 'assistant'

  return (
    <div
      className={cn(
        'flex gap-2.5 px-4 py-4 group w-full min-w-0',
        'transition-all duration-300 ease-out',
        isUser 
          ? 'justify-end animate-slideInFromRight' 
          : 'justify-start animate-slideInFromLeft'
      )}
    >
      {/* Assistant Avatar (left) */}
      {!isUser && <Avatar variant="assistant" src="/assets/nixa.png" />}

      {/* Message Bubble */}
      <div
        className={cn(
          'max-w-[80%] sm:max-w-[75%] md:max-w-[70%] min-w-0 flex flex-col gap-1',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <ChatBubble
          content={message.content}
          sources={message.sources}
          variant={variant}
          isStreaming={isStreaming}
        />
      </div>

      {/* User Avatar (right) */}
      {isUser && <Avatar variant="user" />}
    </div>
  )
}
