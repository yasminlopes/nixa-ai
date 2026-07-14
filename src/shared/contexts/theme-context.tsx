'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'nixa-theme';

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveTheme(mode: ThemeMode): Theme {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return mode;
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [theme, setTheme] = useState<Theme>('light');

  // A classe .dark já foi aplicada no <html> pelo script pré-paint (layout.tsx).
  // Aqui só sincronizamos o state React com a preferência salva e com a classe
  // que já está na tela — sem tocar no DOM, logo sem flash.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    setModeState(saved ?? 'system');
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    if (mode !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const next: Theme = mql.matches ? 'dark' : 'light';
      setTheme(next);
      applyTheme(next);
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
    const resolved = resolveTheme(newMode);
    setTheme(resolved);
    applyTheme(resolved);
  }, []);

  return <ThemeContext.Provider value={{ theme, mode, setMode }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
