'use client'

import { Zap } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

interface AvatarProps {
  variant: 'user' | 'assistant'
  src?: string
  fallback?: React.ReactNode
  className?: string
}

export function Avatar({ variant, src, fallback, className }: AvatarProps) {
  if (variant === 'assistant') {
    return (
      <div
        className={cn(
          'w-9 h-9 rounded-2xl bg-gradient-to-br from-[#4f7a96] to-[#4cacc7]',
          'flex items-center justify-center shrink-0 shadow-md',
          className
        )}
      >
        {src ? (
          <img
            src={src}
            alt="Nixa"
            className={cn('w-full h-full rounded-2xl object-cover', className)}
            onError={e => {
              const target = e.currentTarget
              target.style.display = 'none'
              const fallback = target.nextElementSibling as HTMLElement | null
              if (fallback) fallback.style.display = 'flex'
            }}
          />
        ) : (
          <Zap className="w-4 h-4 text-white" />
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'w-8 h-8 rounded-full bg-gradient-to-br from-[#4f7a96] to-[#425f83]',
        'flex items-center justify-center shrink-0 text-white text-xs font-semibold shadow-md',
        className
      )}
    >
      {fallback || 'Y'}
    </div>
  )
}
