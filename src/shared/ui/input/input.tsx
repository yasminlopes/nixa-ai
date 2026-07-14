import { forwardRef, type InputHTMLAttributes } from 'react'
import clsx from 'clsx'
import styles from './input.module.scss'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={clsx(styles.input, className)} {...props} />
})
