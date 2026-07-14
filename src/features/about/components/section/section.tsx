import { type ReactNode } from 'react'
import styles from './section.module.scss'

export function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h2 className={styles.title}>{title}</h2>
      </div>
      {children}
    </section>
  )
}
