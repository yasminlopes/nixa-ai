import type { Metadata } from 'next';

import { Bricolage_Grotesque, Inter, JetBrains_Mono } from 'next/font/google';

import { AppProviders } from '@/shared/providers/app-provider';
import { themeScript } from '@/shared/theme/theme-script';

import './globals.scss';
import styles from './layout.module.scss';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Nixa',
    template: '%s | Nixa',
  },
  description: 'Assistente especialista em NICE e CXone',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${inter.variable} ${display.variable} ${mono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={styles.body}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
