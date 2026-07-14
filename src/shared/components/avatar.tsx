'use client'

import { cn } from '@/shared/utils/cn'

interface AvatarProps {
  variant: 'user' | 'assistant'
  src?: string
  fallback?: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const SIZE_MAP = {
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-9 h-9 text-[12px]',
  lg: 'w-12 h-12 text-[14px]',
  xl: 'w-20 h-20 text-[20px]',
}

export function Avatar({ variant, src, fallback, className, size = 'md' }: AvatarProps) {
  const sizeClass = SIZE_MAP[size]

  if (variant === 'assistant') {
    return (
      <div
        className={cn(
          'rounded-full overflow-hidden shrink-0 relative',
          sizeClass,
          className
        )}
        style={{
          background: 'linear-gradient(135deg, #4F7AFF 0%, #A78BFA 100%)',
        }}
      >
        <video
          src="/assets/nixa-video.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center shrink-0 font-medium overflow-hidden',
        sizeClass,
        className
      )}
      style={{
        background: 'var(--color-ink)',
        color: 'var(--color-ink-text)',
      }}
    >
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        fallback || 'Y'
      )}
    </div>
  )
}
