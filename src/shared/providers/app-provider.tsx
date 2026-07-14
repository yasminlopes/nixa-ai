'use client';

import { type ReactNode } from 'react';

import { ThemeProvider } from '@/shared/contexts/theme-context';

/**
 * Agrega os providers globais da aplicação, mantendo o `layout.tsx` "burro".
 * Novos providers entram aqui (não no layout), aninhados na ordem correta:
 *
 *   <ThemeProvider>
 *     <AuthProvider>
 *       <QueryProvider>
 *         <ToastProvider>{children}</ToastProvider>
 *       </QueryProvider>
 *     </AuthProvider>
 *   </ThemeProvider>
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
