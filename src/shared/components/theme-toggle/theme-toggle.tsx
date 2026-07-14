'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/shared/contexts/theme-context'
import styles from './theme-toggle.module.scss'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={styles.button}
      aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
      title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
    >
      {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
    </button>
  )
}
