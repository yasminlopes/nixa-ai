'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/shared/contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 rounded-lg hover:bg-[#d4e0f3] dark:hover:bg-[#252d3d] transition-colors group"
      aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
      title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4 text-[#425f83] group-hover:text-[#17223d] transition-colors" />
      ) : (
        <Sun className="w-4 h-4 text-[#6b9dc4] group-hover:text-[#e4e6eb] transition-colors" />
      )}
    </button>
  )
}
