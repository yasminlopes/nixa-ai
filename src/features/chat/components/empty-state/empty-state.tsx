'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import styles from './empty-state.module.scss'

const SUGGESTED = [
  'O que é o CXone e quais são seus principais módulos?',
  'Como autenticar na API REST do CXone?',
  'Como configurar uma fila de atendimento (ACD)?',
  'Quais relatórios estão disponíveis na Reporting API?',
]

export function EmptyState({ onSuggest }: { onSuggest: (q: string) => void }) {
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const n = localStorage.getItem('nixa-user-name')?.trim()
    if (n) setUserName(n)
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 5 ? 'Boa noite' : hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className={styles.wrapper}>
      <div className={clsx(styles.avatarWrap, 'animate-fadeIn')}>
        <div className={clsx(styles.avatarCircle, 'nixa-glow')}>
          <video
            src="/assets/nixa-video.mp4"
            autoPlay
            muted
            loop
            playsInline
            className={styles.avatarVideo}
          />
        </div>
      </div>

      <h1 className={clsx(styles.title, 'animate-fadeIn')} style={{ animationDelay: '0.05s' }}>
        {greeting}{userName ? `, ${userName}` : ''}
      </h1>

      <p className={clsx(styles.subtitle, 'animate-fadeIn')} style={{ animationDelay: '0.1s' }}>
        Como posso te ajudar hoje?
      </p>

      <div className={styles.suggestions}>
        {SUGGESTED.map((q, idx) => (
          <button
            key={q}
            onClick={() => onSuggest(q)}
            style={{ animationDelay: `${0.15 + idx * 0.05}s` }}
            className={clsx(styles.suggestion, 'animate-fadeIn')}
          >
            <span className={styles.suggestionText}>{q}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
