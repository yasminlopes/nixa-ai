import { type HTMLAttributes } from 'react'
import clsx from 'clsx'
import styles from './card.module.scss'

export type CardPadding = 'sm' | 'md' | 'lg'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding
}

const PADDING_CLASS: Record<CardPadding, string> = {
  sm: styles.padSm,
  md: styles.padMd,
  lg: styles.padLg,
}

export function Card({ padding = 'md', className, ...props }: CardProps) {
  return <div className={clsx(styles.card, PADDING_CLASS[padding], className)} {...props} />
}
