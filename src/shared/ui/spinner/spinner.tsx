import clsx from 'clsx'
import styles from './spinner.module.scss'

export type SpinnerSize = 'sm' | 'md' | 'lg'

export interface SpinnerProps {
  size?: SpinnerSize
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return <span className={clsx(styles.spinner, styles[size], className)} />
}
