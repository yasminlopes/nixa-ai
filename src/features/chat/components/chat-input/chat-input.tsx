'use client'

import { useRef, useEffect, type KeyboardEvent } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import clsx from 'clsx'
import { type Provider } from '../../types'
import { ProviderSelect } from '@/shared/components/provider-select'
import styles from './chat-input.module.scss'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onStop: () => void
  isLoading: boolean
  disabled?: boolean
  provider?: Provider
  onProviderChange?: (provider: Provider) => void
  hasKeys?: Partial<Record<Provider, boolean>>
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading,
  disabled,
  provider = 'gemini',
  onProviderChange,
  hasKeys = {},
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = Math.min(element.scrollHeight, 220) + 'px'
  }, [value])

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (!isLoading && value.trim()) onSubmit()
    }
  }

  const canSubmit = value.trim().length > 0 && !disabled

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputBox}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte algo..."
          rows={1}
          disabled={disabled}
          className={styles.textarea}
        />

        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <ProviderSelect
              value={provider}
              onChange={p => onProviderChange?.(p)}
              disabled={isLoading}
              showHint={false}
              size="sm"
              hasKeys={hasKeys}
            />
          </div>

          {isLoading ? (
            <button
              onClick={onStop}
              className={clsx(styles.actionButton, styles.stopButton)}
              title="Parar"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={!canSubmit}
              className={clsx(
                styles.actionButton,
                styles.sendButton,
                canSubmit ? styles.sendButtonActive : styles.sendButtonDisabled
              )}
              title="Enviar (↵)"
            >
              <ArrowUp size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      <p className={styles.disclaimer}>
        A Nixa pode cometer erros ou trazer informações imprecisas. Sempre confirme nas fontes oficiais da documentação NICE/CXone.
      </p>
      <p className={styles.shortcuts}>
        ↵ enviar &nbsp;·&nbsp; ⇧+↵ nova linha
      </p>
    </div>
  )
}
