'use client'

import React from 'react'
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

function renderCodeBlock(language: string, code: string) {
  const [copied, setCopied] = React.useState(false)
  const SyntaxHighlighterComponent = SyntaxHighlighter as unknown as React.ComponentType<any>

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden my-3 text-xs w-full"
      style={{ border: '1px solid var(--color-border)' }}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ background: 'var(--color-surface-2)' }}
      >
        <span className="text-[11px] font-mono font-medium" style={{ color: 'var(--color-text-soft)' }}>
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] font-medium transition-colors"
          style={{ color: copied ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <SyntaxHighlighterComponent
        style={oneDark}
        language={language}
        PreTag="div"
        wrapLongLines
        customStyle={{
          margin: 0, borderRadius: 0, fontSize: '0.8rem',
          maxWidth: '100%', overflowX: 'auto',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          background: '#0F1014', color: '#F4F5F8',
          fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
        }}
      >
        {code}
      </SyntaxHighlighterComponent>
    </div>
  )
}

function CopyButton({ text, onDark = false }: { text: string; onDark?: boolean }) {
  const { copied, copy } = useCopy()

  async function handleCopy() {
    const clean = text
      .replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1').trim()
    await copy(clean)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-[11px] font-medium transition-colors"
      style={{
        color: copied
          ? (onDark ? 'rgba(255,255,255,0.8)' : 'var(--color-accent)')
          : (onDark ? 'rgba(255,255,255,0.45)' : 'var(--color-text-muted)'),
      }}
      title={copied ? 'Copiado' : 'Copiar'}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

export function ChatBubble({
  content,
  sources,
  isStreaming = false,
  variant = 'assistant',
}: ChatBubbleProps) {
  const isAssistant = variant === 'assistant'
  const unique = sources ? sources.filter((s, i, arr) => arr.findIndex(x => x.url === s.url) === i) : []
  const isInterrupted = content === '__interrupted__'

  if (isAssistant) {
    return (
      <div
        className="rounded-3xl rounded-tl-lg px-5 py-4 w-full min-w-0"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className={cn('min-w-0 w-full prose-message', isStreaming && content && 'streaming-cursor')}>
          {isInterrupted ? (
            <p className="text-[13.5px] italic" style={{ color: 'var(--color-text-muted)' }}>
              Geração interrompida.
            </p>
          ) : content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  const code = String(children).replace(/\n$/, '')
                  return match ? renderCodeBlock(match[1], code) : (
                    <code className={className} {...props}>{children}</code>
                  )
                },
                a: ({ children, href }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          ) : (
            <TypingIndicator />
          )}
        </div>

        {!isStreaming && content && !isInterrupted && (
          <div
            className="mt-4 pt-3 flex items-center justify-between gap-3"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            {unique.length > 0 ? <SourcesInline sources={unique} /> : <span />}
            <CopyButton text={content} />
          </div>
        )}
      </div>
    )
  }

  // USER — pill arredondada azul accent
  return (
    <div
      className="rounded-3xl rounded-tr-lg px-5 py-3 text-[14.5px] leading-relaxed min-w-0 max-w-full"
      style={{
        background: 'var(--color-ink)',
        color: 'var(--color-ink-text)',
      }}
    >
      <div className="min-w-0 w-full">
        {content ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              code: ({ children }) => (
                <code
                  className="px-1.5 py-0.5 rounded text-xs font-mono"
                  style={{ background: 'rgba(255,255,255,0.14)' }}
                >
                  {children}
                </code>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        ) : null}
      </div>
    </div>
  )
}

function SourcesInline({ sources }: { sources: Source[] }) {
  return (
    <details className="group flex-1 min-w-0">
      <summary
        className="list-none cursor-pointer flex items-center gap-1.5 text-[11.5px] font-medium select-none w-fit transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <Link2 className="w-3 h-3 shrink-0" />
        <span>{sources.length} {sources.length === 1 ? 'fonte' : 'fontes'}</span>
        <ChevronDown className="w-2.5 h-2.5 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2 space-y-1.5 flex flex-col">
        {sources.map((src, i) => (
          <a
            key={i}
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
            title={src.title}
            className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full transition-all group/src hover:translate-x-px"
            style={{
              background: 'var(--color-surface-2)',
              color: 'var(--color-text-soft)',
              border: '1px solid var(--color-border)',
            }}
          >
            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-50 group-hover/src:opacity-100" />
            <span className="truncate">{src.title.length > 60 ? src.title.slice(0, 60) + '…' : src.title}</span>
          </a>
        ))}
      </div>
    </details>
  )
}
