'use client'

import { useRef, useEffect, type KeyboardEvent } from 'react'
import { ArrowUp, Square, Paperclip } from 'lucide-react'
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
            <button type="button" className={styles.attachButton} title="Anexar">
              <Paperclip size={14} />
            </button>
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
