'use client'

import { useEffect, useState, type ReactNode, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import styles from './modal.module.scss'

export interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  /** Desabilita fechar via Esc/clique fora — útil quando há uma ação em andamento. */
  disableDismiss?: boolean
}

export function Modal({ open, onClose, children, className, disableDismiss = false }: ModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!open || disableDismiss) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, disableDismiss, onClose])

  if (!mounted || !open) return null

  function handleOverlayMouseDown(e: MouseEvent<HTMLDivElement>) {
    if (disableDismiss) return
    if (e.target === e.currentTarget) onClose()
  }

  return createPortal(
    <div className={styles.overlay} onMouseDown={handleOverlayMouseDown}>
      <div className={clsx(styles.panel, className)}>{children}</div>
    </div>,
    document.body
  )
}
