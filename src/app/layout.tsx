import type { Metadata } from 'next'
import { Inter, Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/shared/contexts/theme-context'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Nixa',
  description: 'Assistente especialista em NICE e CXone',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${display.variable} ${mono.variable} h-full font-sans antialiased`}
        style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
