'use client'

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ExternalLink, ChevronDown, Link2, Check, Copy } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Source } from '@/shared/types'
import { cn } from '@/shared/utils/cn'
import { useCopy } from '@/shared/hooks/useCopy'
import { TypingIndicator } from './TypingIndicator'

interface ChatBubbleProps {
  content: string
  sources?: Source[]
  isUser?: boolean
  isStreaming?: boolean
  variant?: 'user' | 'assistant'
}

// Helper para renderizar code blocks
function renderCodeBlock(language: string, code: string, isDark: boolean) {
  const [copied, setCopied] = React.useState(false)
  const SyntaxHighlighterComponent = SyntaxHighlighter as unknown as React.ComponentType<any>

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('relative rounded-lg overflow-hidden border my-2 text-xs w-full max-w-full min-w-0', isDark ? 'border-gray-700' : 'border-gray-300')}>
      <div className={cn('flex items-center justify-between gap-2 px-3 py-2 min-w-0', isDark ? 'bg-[#282c34]' : 'bg-[#eeeeee]')}>
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

export function ChatBubble({
  content,
  sources,
  isUser = false,
  isStreaming = false,
  variant = isUser ? 'user' : 'assistant',
}: ChatBubbleProps) {
  const isAssistant = variant === 'assistant'
  const unique = sources ? sources.filter((s, i, arr) => arr.findIndex(x => x.url === s.url) === i) : []
  const { copied, copy } = useCopy()

  const handleCopy = async () => {
    // Remove markdown formatting para dar texto limpo
    const cleanText = content
      .replace(/\*\*/g, '') // Remove negrito
      .replace(/\*/g, '') // Remove itálico
      .replace(/`/g, '') // Remove inline code
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links mas mantém texto
      .trim()
    
    await copy(cleanText)
  }

  return (
    <div
      className={cn(
        'rounded-3xl px-4 py-3 text-sm leading-relaxed min-w-0 w-full',
        variant === 'user'
          ? 'bg-gradient-to-br from-[#4f7a96] to-[#425f83] text-white rounded-tr-lg shadow-md'
          : 'bg-gradient-to-br from-white to-[#fafbfc] dark:from-[#1a1f2e] dark:to-[#1a1f2e] border border-[#e0e8f0] dark:border-[#2d3748] text-[#17223d] dark:text-[#e4e6eb] rounded-tl-lg shadow-sm'
      )}
    >
      {/* Header com botão de copiar (apenas para IA) */}
      {isAssistant && content && (
        <div className="flex justify-end mb-2 -mx-1 -mt-1">
          <button
            onClick={handleCopy}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium',
              'transition-all duration-200 group',
              copied
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'text-gray-400 dark:text-[#6b7280] hover:text-gray-600 dark:hover:text-[#9ac5ef] hover:bg-gray-100 dark:hover:bg-[#252d3d]'
            )}
            title={copied ? 'Copiado!' : 'Copiar resposta'}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">Copiar</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className={cn('min-w-0 w-full', isStreaming && !content && 'streaming-cursor')}>
        {content ? (
          <div className={cn('min-w-0 w-full', isStreaming && 'streaming-cursor')}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                li: ({ children }) => <li className="text-inherit">{children}</li>,
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  const code = String(children).replace(/\n$/, '')
                  return match ? (
                    renderCodeBlock(match[1], code, isAssistant)
                  ) : (
                    <code
                      className={cn(
                        'px-1.5 py-0.5 rounded text-xs font-mono',
                        variant === 'user'
                          ? 'bg-black/20 text-white'
                          : 'bg-[#e0e8f0] text-[#17223d]'
                      )}
                      {...props}
                    >
                      {children}
                    </code>
                  )
                },
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'underline transition-colors',
                      variant === 'user'
                        ? 'text-white hover:text-gray-200'
                        : 'text-[#4f7a96] hover:text-[#425f83]'
                    )}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <TypingIndicator />
            <span className={cn(isAssistant ? 'text-gray-400 text-sm' : 'text-white')} >Pensando...</span>
          </div>
        )}
      </div>

      {/* Sources Footer (integrated in bubble) */}
      {isAssistant && unique.length > 0 && (
        <SourcesFooter sources={unique} />
      )}
    </div>
  )
}

function SourcesFooter({ sources }: { sources: Source[] }) {
  return (
    <details className="mt-3 pt-3 border-t border-[#e0e8f0] dark:border-[#2d3748] group">
      <summary className="list-none cursor-pointer flex items-center gap-1.5 text-[11px] text-[#7a8fa1] dark:text-[#6b7280] hover:text-[#5a7a91] dark:hover:text-[#9ac5ef] transition-colors">
        <Link2 className="w-3 h-3 shrink-0" />
        <span>Fontes ({sources.length})</span>
        <ChevronDown className="w-2.5 h-2.5 transition-transform group-open:rotate-180 ml-auto" />
      </summary>
      <div className="mt-2 space-y-1.5 flex flex-col">
        {sources.map((src, i) => (
          <a
            key={i}
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
            title={src.title}
            className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg
                       bg-[#f9fafb] dark:bg-[#252d3d] text-[#5a7a91] dark:text-[#9ac5ef] hover:bg-[#f0f4f9] dark:hover:bg-[#2d3748] transition-colors
                       border border-[#e0e8f0] dark:border-[#2d3748] group/link"
          >
            <ExternalLink className="w-2.5 h-2.5 shrink-0 text-[#9db0bf] group-hover/link:text-[#4f7a96]" />
            <span className="truncate">{src.title.length > 50 ? src.title.slice(0, 50) + '…' : src.title}</span>
          </a>
        ))}
      </div>
    </details>
  )
}
