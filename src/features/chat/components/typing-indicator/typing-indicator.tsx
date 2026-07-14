import styles from './typing-indicator.module.scss'

export function TypingIndicator() {
  return (
    <div className={styles.wrapper}>
      <span className={styles.dot} style={{ animationDelay: '0ms' }} />
      <span className={styles.dot} style={{ animationDelay: '180ms' }} />
      <span className={styles.dot} style={{ animationDelay: '360ms' }} />
    </div>
  )
}
