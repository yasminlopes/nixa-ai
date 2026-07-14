import { type ReactNode } from 'react'
import styles from './tooltip.module.scss'

export interface TooltipProps {
  label: string
  children: ReactNode
}

export function Tooltip({ label, children }: TooltipProps) {
  return (
    <span className={styles.wrapper}>
      {children}
      <span className={styles.bubble} role="tooltip">
        {label}
      </span>
    </span>
  )
}
