'use client'

import { useRef, useEffect, KeyboardEvent } from 'react'
import { ArrowUp, Square, Paperclip } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { type Provider } from '@/core/providers'
import { ProviderSelect } from '@/shared/components/provider-select'

interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onStop: () => void
  isLoading: boolean
  disabled?: boolean
  provider?: Provider
  onProviderChange?: (provider: Provider) => void
  isSavingProvider?: boolean
  hasKeys?: Partial<Record<Provider, boolean>>
}

export function MessageInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading,
  disabled,
  provider = 'gemini',
  onProviderChange,
  isSavingProvider = false,
  hasKeys = {},
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 220) + 'px'
  }, [value])

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && value.trim()) onSubmit()
    }
  }

  const canSubmit = value.trim().length > 0 && !disabled

  return (
    <div className="relative w-full">
      <div
        className="rounded-[28px] transition-all duration-200 focus-within:ring-focus"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 4px 16px -4px rgba(15,16,20,0.06)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte algo..."
          rows={1}
          disabled={disabled}
          className="w-full resize-none outline-none bg-transparent leading-relaxed max-h-[220px] overflow-y-auto scrollbar-thin px-5 pt-4 pb-2 text-[15px]"
          style={{
            color: 'var(--color-text)',
            fontFamily: 'var(--font-sans), Inter, sans-serif',
          }}
        />

        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              title="Anexar"
            >
              <Paperclip className="w-3.5 h-3.5" />
            </button>
            <ProviderSelect
              value={provider}
              onChange={p => onProviderChange?.(p)}
              disabled={isSavingProvider || isLoading}
              showHint={false}
              size="sm"
              hasKeys={hasKeys}
            />
            {isSavingProvider && (
              <span className="text-[11px] animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
                salvando…
              </span>
            )}
          </div>

          {isLoading ? (
            <button
              onClick={onStop}
              className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 transition-all hover:scale-105"
              style={{
                background: 'var(--color-surface-2)',
                color: 'var(--color-text-soft)',
              }}
              title="Parar"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={!canSubmit}
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-full shrink-0 transition-all',
                canSubmit ? 'hover:scale-105 active:scale-95' : 'cursor-not-allowed'
              )}
              style={{
                background: canSubmit ? 'var(--color-ink)' : 'var(--color-surface-2)',
                color: canSubmit ? 'var(--color-ink-text)' : 'var(--color-text-muted)',
              }}
              title="Enviar (↵)"
            >
              <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      <p
        className="mt-2.5 text-[10.5px] leading-snug text-center max-w-md mx-auto"
        style={{ color: 'var(--color-text-muted)' }}
      >
        A Nixa pode cometer erros ou trazer informações imprecisas. Sempre confirme nas fontes oficiais da documentação NICE/CXone.
      </p>
      <p
        className="mt-1 text-[10px] tracking-wide text-center"
        style={{ color: 'var(--color-text-muted)', opacity: 0.65 }}
      >
        ↵ enviar &nbsp;·&nbsp; ⇧+↵ nova linha
      </p>
    </div>
  )
}
