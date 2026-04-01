'use client'

import { useRef, useEffect, KeyboardEvent } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { PROVIDERS, type Provider } from '@/core/providers'
import { ProviderSelect } from '@/shared/components/ProviderSelect'

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
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [value])

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && value.trim()) onSubmit()
    }
  }

  const canSubmit = value.trim().length > 0 && !disabled
  const currentHint = PROVIDERS[provider]?.hint ?? ''

  return (
    <div className="relative w-full space-y-2">
      {/* Linha de metadados: hint + seletor de LLM */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] text-[#5d7594]">{currentHint}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#5d7594]">LLM</span>
          <ProviderSelect
            value={provider}
            onChange={p => onProviderChange?.(p)}
            disabled={isSavingProvider || isLoading}
            showHint={false}
            size="sm"
            hasKeys={hasKeys}
          />
          {isSavingProvider && (
            <span className="text-[11px] text-[#5d7594] animate-pulse">salvando...</span>
          )}
        </div>
      </div>

      {/* Área de input */}
      <div
        className={cn(
          'flex items-end gap-2 bg-white dark:bg-[#1a1f2e] border border-[#d4e0f3] dark:border-[#2d3748] rounded-2xl px-4 py-3',
          'shadow-sm focus-within:border-[#4f7a96] focus-within:ring-2 focus-within:ring-[#d4e0f3] dark:focus-within:ring-[#2d3748]',
          'transition-all duration-150'
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte sobre NICE CXone..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none outline-none text-sm text-gray-800 dark:text-[#e4e6eb] placeholder:text-gray-400 dark:placeholder:text-[#6b7280]
                     bg-transparent leading-relaxed max-h-[200px] overflow-y-auto scrollbar-thin"
        />

        {isLoading ? (
          <button
            onClick={onStop}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-200 dark:bg-[#252d3d]
                       hover:bg-gray-300 dark:hover:bg-[#2d3748] transition-colors shrink-0"
            title="Parar geração"
          >
            <Square className="w-3.5 h-3.5 text-gray-600 dark:text-[#9ac5ef] fill-gray-600 dark:fill-[#9ac5ef]" />
          </button>
        ) : (
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg transition-all shrink-0',
              canSubmit
                ? 'bg-[#4f7a96] hover:bg-[#425f83] text-white shadow-sm'
                : 'bg-gray-100 dark:bg-[#252d3d] text-gray-400 dark:text-[#6b7280] cursor-not-allowed'
            )}
            title="Enviar (Enter)"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-[11px] text-gray-400 dark:text-[#6b7280] text-center mt-2">
        Enter para enviar · Shift+Enter para quebrar linha
      </p>
    </div>
  )
}
