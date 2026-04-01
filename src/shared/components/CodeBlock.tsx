'use client'

import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

interface CodeBlockProps {
  language: string
  code: string
  isDark?: boolean
}

export function CodeBlock({ language, code, isDark = true }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const SyntaxHighlighterComponent = SyntaxHighlighter as unknown as React.ComponentType<any>

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const bgColor = isDark ? 'bg-[#1e1e1e]' : 'bg-[#f5f5f5]'
  const textColor = isDark ? 'text-gray-300' : 'text-gray-700'
  const headerBg = isDark ? 'bg-[#282c34]' : 'bg-[#eeeeee]'

  return (
    <div className={cn('relative rounded-lg overflow-hidden border my-2 text-xs w-full max-w-full min-w-0', isDark ? 'border-gray-700' : 'border-gray-300')}>
      <div className={cn('flex items-center justify-between gap-2 px-3 py-2 min-w-0', headerBg)}>
        <span className={cn('text-[11px] font-mono font-semibold', isDark ? 'text-gray-400' : 'text-gray-600')}>
          {language}
        </span>
        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1 transition-colors text-[11px] shrink-0 font-medium',
            isDark
              ? 'text-gray-500 hover:text-gray-200'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copiado!' : 'Copiar'}</span>
        </button>
      </div>
      <SyntaxHighlighterComponent
        style={oneDark}
        language={language}
        PreTag="div"
        wrapLongLines
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: '0.8rem',
          maxWidth: '100%',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          background: isDark ? '#1e1e1e' : '#f5f5f5',
          color: isDark ? '#d4d4d4' : '#333333',
        }}
      >
        {code}
      </SyntaxHighlighterComponent>
    </div>
  )
}
