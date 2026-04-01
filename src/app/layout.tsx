import type { Metadata } from 'next'
import { Public_Sans } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/shared/contexts/ThemeContext'

const publicSans = Public_Sans({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Nixa AI',
  description: 'Assistente especialista em NICE e CXone',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${publicSans.className} h-full`} style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
