'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/shared/contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
      style={{ color: 'var(--color-text-muted)' }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--color-hover)'
        e.currentTarget.style.color = 'var(--color-text)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--color-text-muted)'
      }}
      aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
      title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
    >
      {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
    </button>
  )
}
