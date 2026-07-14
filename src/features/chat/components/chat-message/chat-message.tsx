'use client'

import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ExternalLink, ChevronDown, Link2, Check, Copy } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import clsx from 'clsx'
import { type MessageType, type Source } from '../../types'
import { useCopy } from '@/shared/hooks/use-copy'
import { Avatar } from '@/shared/ui/avatar'
import { TypingIndicator } from '../typing-indicator'
import styles from './chat-message.module.scss'

interface ChatMessageProps {
  message: MessageType
  isStreaming?: boolean
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const SyntaxHighlighterComponent = SyntaxHighlighter as unknown as React.ComponentType<any>

  async function handleCopy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeBlockHeader}>
        <span className={styles.codeBlockLanguage}>{language}</span>
        <button
          onClick={handleCopy}
          className={clsx(styles.copyButton, copied && styles.copyButtonActive)}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
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

function CopyMessageButton({ text }: { text: string }) {
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
      className={clsx(styles.copyButton, copied && styles.copyButtonActive)}
      title={copied ? 'Copiado' : 'Copiar'}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

function SourcesInline({ sources }: { sources: Source[] }) {
  return (
    <details className={styles.sources}>
      <summary className={styles.sourcesSummary}>
        <Link2 size={12} style={{ flexShrink: 0 }} />
        <span>{sources.length} {sources.length === 1 ? 'fonte' : 'fontes'}</span>
        <ChevronDown className={styles.sourcesChevron} />
      </summary>
      <div className={styles.sourcesList}>
        {sources.map((src, i) => (
          <a
            key={i}
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
            title={src.title}
            className={styles.sourceLink}
          >
            <ExternalLink className={styles.sourceLinkIcon} />
            <span className={styles.sourceLinkText}>
              {src.title.length > 60 ? src.title.slice(0, 60) + '…' : src.title}
            </span>
          </a>
        ))}
      </div>
    </details>
  )
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [userName, setUserName] = useState('Y')

  useEffect(() => {
    if (!isUser) return
    setUserAvatar(localStorage.getItem('nixa-user-avatar')?.trim() || null)
    const n = localStorage.getItem('nixa-user-name')?.trim()
    if (n) setUserName(n.slice(0, 1).toUpperCase())
  }, [isUser])

  const content = message.content
  const sources = message.sources
  const unique = sources ? sources.filter((s, i, arr) => arr.findIndex(x => x.url === s.url) === i) : []
  const isInterrupted = content === '__interrupted__'

  return (
    <div className={clsx(styles.row, isUser ? styles.rowUser : styles.rowAssistant)}>
      {!isUser && <Avatar variant="assistant" size="md" />}

      <div className={clsx(styles.bubbleWrap, isUser ? styles.bubbleWrapUser : styles.bubbleWrapAssistant)}>
        {isUser ? (
          <div className={styles.userBubble}>
            <div className={styles.userBubbleBody}>
              {content ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p>{children}</p>,
                    code: ({ children }) => (
                      <code className={styles.userInlineCode}>{children}</code>
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              ) : null}
            </div>
          </div>
        ) : (
          <div className={styles.assistantBubble}>
            <div className={clsx('prose-message', isStreaming && content && 'streaming-cursor')}>
              {isInterrupted ? (
                <p className={styles.interrupted}>Geração interrompida.</p>
              ) : content ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '')
                      const code = String(children).replace(/\n$/, '')
                      return match ? <CodeBlock language={match[1]} code={code} /> : (
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
              <div className={styles.footer}>
                {unique.length > 0 ? <SourcesInline sources={unique} /> : <span />}
                <CopyMessageButton text={content} />
              </div>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <Avatar variant="user" src={userAvatar || undefined} fallback={userName} size="md" />
      )}
    </div>
  )
}
