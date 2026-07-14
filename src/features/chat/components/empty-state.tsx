'use client'

import { useEffect, useState } from 'react'

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
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] max-w-2xl mx-auto px-6 w-full text-center">
      {/* Nixa avatar grande */}
      <div className="mb-6 animate-fadeIn">
        <div className="nixa-glow w-24 h-24 rounded-full overflow-hidden relative"
             style={{ background: 'linear-gradient(135deg, #4F7AFF 0%, #A78BFA 100%)' }}>
          <video
            src="/assets/nixa-video.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <h1
        className="font-display font-semibold text-[42px] sm:text-[52px] leading-[1.05] tracking-tight mb-2 animate-fadeIn"
        style={{ animationDelay: '0.05s', color: 'var(--color-text)' }}
      >
        {greeting}{userName ? `, ${userName}` : ''}
      </h1>

      <p
        className="text-[18px] mb-10 max-w-md leading-relaxed animate-fadeIn"
        style={{ animationDelay: '0.1s', color: 'var(--color-text-soft)' }}
      >
        Como posso te ajudar hoje?
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
        {SUGGESTED.map((q, idx) => (
          <button
            key={q}
            onClick={() => onSuggest(q)}
            style={{
              animationDelay: `${0.15 + idx * 0.05}s`,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-soft)',
            }}
            className="text-left text-[13.5px] leading-snug px-4 py-3 rounded-2xl
                       hover:translate-y-[-1px] hover:shadow-sm transition-all animate-fadeIn group
                       hover:border-[var(--color-accent)]"
          >
            <span className="block transition-colors group-hover:text-[var(--color-accent)]">
              {q}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
