import { type HTMLAttributes } from 'react'
import clsx from 'clsx'
import styles from './badge.module.scss'

export type BadgeTone = 'neutral' | 'accent' | 'danger'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return <span className={clsx(styles.badge, styles[tone], className)} {...props} />
}
