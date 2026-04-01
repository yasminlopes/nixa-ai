'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Lock } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { PROVIDERS, type Provider } from '@/core/providers'
import { ProviderIcon } from './ProviderIcon'

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

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const availableOptions = OPTIONS.filter(o => hasKeys[o.value])

  // Fechar com Escape, navegar com setas (apenas entre opções disponíveis)
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v); return }
    if (!open || availableOptions.length === 0) return
    const idx = availableOptions.findIndex(o => o.value === value)
    if (e.key === 'ArrowDown') { e.preventDefault(); onChange(availableOptions[(idx + 1) % availableOptions.length].value) }
    if (e.key === 'ArrowUp') { e.preventDefault(); onChange(availableOptions[(idx - 1 + availableOptions.length) % availableOptions.length].value) }
  }

  const triggerSizeClass = size === 'sm'
    ? 'px-2.5 py-1.5 text-xs gap-1.5'
    : 'px-3 py-2 text-sm gap-2'

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(v => !v)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex items-center rounded-lg border border-[#c8d5e8] bg-[#f8fcff]',
          'text-[#2f4a6b] font-medium transition-all duration-150',
          'hover:border-[#4f7a96] hover:bg-[#eef4fb] focus:outline-none focus:ring-2 focus:ring-[#4f7a96]/30',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          triggerSizeClass,
        )}
      >
        <span className="w-4 h-4 flex items-center justify-center shrink-0 text-[#2f4a6b]">
          <ProviderIcon provider={current.value} />
        </span>
        <span>{current.label}</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-[#5d7594] transition-transform duration-150 shrink-0',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Selecionar LLM"
          className={cn(
            'absolute z-50 min-w-[160px] rounded-xl border border-[#d4e0f3]',
            'bg-white shadow-lg shadow-[#c8d5e8]/40 overflow-hidden',
            // Open upward instead of downward
            'right-0 bottom-full mb-1.5'
          )}
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
                  noKey
                    ? 'opacity-40 cursor-not-allowed bg-white'
                    : isSelected
                      ? 'bg-[#f0f6ff] hover:bg-[#eef4fb]'
                      : 'bg-white hover:bg-[#eef4fb] focus:outline-none focus:bg-[#eef4fb]'
                )}
              >
                <span className="w-5 h-5 flex items-center justify-center shrink-0 text-[#2f4a6b]">
                  <ProviderIcon provider={option.value} />
                </span>

                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-[#17223d] leading-tight">
                    {option.label}
                  </span>
                  {showHint && (
                    <span className="block text-[11px] text-[#5d7594] leading-tight mt-0.5">
                      {noKey ? 'Sem chave configurada' : option.hint}
                    </span>
                  )}
                </span>

                {noKey
                  ? <Lock className="w-3 h-3 text-[#94a6b8] shrink-0" />
                  : isSelected && <Check className="w-3.5 h-3.5 text-[#4f7a96] shrink-0" />
                }
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
