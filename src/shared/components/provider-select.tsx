'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Lock } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { PROVIDERS, type Provider } from '@/core/providers'
import { ProviderIcon } from './provider-icon'

export interface ProviderOption {
  value: Provider
  label: string
  hint: string
}

interface ProviderSelectProps {
  value: Provider
  onChange: (value: Provider) => void
  disabled?: boolean
  showHint?: boolean
  size?: 'sm' | 'md'
  hasKeys?: Partial<Record<Provider, boolean>>
}

const OPTIONS: ProviderOption[] = (Object.keys(PROVIDERS) as Provider[]).map(key => ({
  value: key,
  label: PROVIDERS[key].label,
  hint: PROVIDERS[key].hint,
}))

export function ProviderSelect({
  value,
  onChange,
  disabled = false,
  showHint = true,
  size = 'sm',
  hasKeys = {},
}: ProviderSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const current = OPTIONS.find(o => o.value === value) ?? OPTIONS[0]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const availableOptions = OPTIONS.filter(o => hasKeys[o.value])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v); return }
    if (!open || availableOptions.length === 0) return
    const idx = availableOptions.findIndex(o => o.value === value)
    if (e.key === 'ArrowDown') { e.preventDefault(); onChange(availableOptions[(idx + 1) % availableOptions.length].value) }
    if (e.key === 'ArrowUp') { e.preventDefault(); onChange(availableOptions[(idx - 1 + availableOptions.length) % availableOptions.length].value) }
  }

  const triggerSize = size === 'sm' ? 'px-2.5 py-1 text-[12px] gap-1.5' : 'px-3 py-1.5 text-[13px] gap-2'

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => !disabled && setOpen(v => !v)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex items-center rounded-full font-medium transition-all duration-150',
          'focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
          triggerSize
        )}
        style={{
          background: 'transparent',
          color: 'var(--color-text-soft)',
          border: '1px solid var(--color-border)',
        }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--color-hover)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
          <ProviderIcon provider={current.value} />
        </span>
        <span>{current.label}</span>
        <ChevronDown
          className={cn('w-3 h-3 transition-transform duration-150 shrink-0', open && 'rotate-180')}
          style={{ color: 'var(--color-text-muted)' }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Selecionar LLM"
          className="absolute z-50 min-w-[200px] rounded-[14px] overflow-hidden right-0 bottom-full mb-2 animate-fadeIn"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 12px 24px -6px rgba(58,55,47,0.12), 0 4px 8px -4px rgba(58,55,47,0.08)',
          }}
        >
          {OPTIONS.map(option => {
            const isSelected = option.value === value
            const noKey = Object.keys(hasKeys).length > 0 && !hasKeys[option.value]
            return (
              <button
                key={option.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={noKey}
                type="button"
                onClick={() => { if (!noKey) { onChange(option.value); setOpen(false) } }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
                  noKey && 'opacity-40 cursor-not-allowed'
                )}
                style={{
                  background: isSelected && !noKey ? 'var(--color-accent-soft)' : 'transparent',
                }}
                onMouseEnter={e => {
                  if (noKey || isSelected) return
                  e.currentTarget.style.background = 'var(--color-hover)'
                }}
                onMouseLeave={e => {
                  if (noKey || isSelected) return
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <span className="w-4 h-4 flex items-center justify-center shrink-0">
                  <ProviderIcon provider={option.value} />
                </span>
                <span className="flex-1 min-w-0">
                  <span
                    className="block text-[13px] font-medium leading-tight"
                    style={{ color: isSelected && !noKey ? 'var(--color-accent-deep)' : 'var(--color-text)' }}
                  >
                    {option.label}
                  </span>
                  {showHint && (
                    <span
                      className="block text-[10.5px] leading-tight mt-0.5"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {noKey ? 'sem chave configurada' : option.hint}
                    </span>
                  )}
                </span>
                {noKey
                  ? <Lock className="w-3 h-3 shrink-0" style={{ color: 'var(--color-text-muted)' }} />
                  : isSelected && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-accent)' }} />
                }
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
