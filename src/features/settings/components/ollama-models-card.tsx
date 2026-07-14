'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { LlamaIcon } from '@/shared/components/llama-icon'

interface OllamaModel {
  name: string
  size: string
  desc: string
  pull: string
  badge?: 'recomendado' | 'leve' | 'qualidade'
  category: 'chat' | 'embedding'
}

const OLLAMA_MODELS: OllamaModel[] = [
  { name: 'llama3.2:1b',      size: '1.3 GB',  desc: 'Chat leve, OK em PT-BR',                pull: 'ollama pull llama3.2:1b',      badge: 'recomendado', category: 'chat' },
  { name: 'gemma2:2b',        size: '1.6 GB',  desc: 'Google Gemma, balanceado',              pull: 'ollama pull gemma2:2b',                              category: 'chat' },
  { name: 'qwen2.5:1.5b',     size: '1.9 GB',  desc: 'Melhor da categoria leve',              pull: 'ollama pull qwen2.5:1.5b',                           category: 'chat' },
  { name: 'qwen2.5:0.5b',     size: '400 MB',  desc: 'Ultraleve, fallback',                   pull: 'ollama pull qwen2.5:0.5b',     badge: 'leve',        category: 'chat' },
  { name: 'llama3.1',         size: '4.7 GB',  desc: 'Melhor qualidade, exige 16GB+ RAM',     pull: 'ollama pull llama3.1',         badge: 'qualidade',   category: 'chat' },

  { name: 'all-minilm',       size: '46 MB',   desc: 'Microscópico (384-dim)',                pull: 'ollama pull all-minilm',       badge: 'recomendado', category: 'embedding' },
  { name: 'nomic-embed-text', size: '274 MB',  desc: 'Mais qualidade (768-dim)',              pull: 'ollama pull nomic-embed-text', badge: 'qualidade',   category: 'embedding' },
]

export function OllamaModelsCard() {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)
  const [tab, setTab] = useState<'chat' | 'embedding'>('chat')

  async function copyCommand(cmd: string) {
    await navigator.clipboard.writeText(cmd)
    setCopiedCmd(cmd)
    setTimeout(() => setCopiedCmd(null), 1800)
  }

  const models = OLLAMA_MODELS.filter(m => m.category === tab)

  return (
    <div
      className="mt-4 rounded-[16px] p-5"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
        >
          <LlamaIcon size={18} />
        </div>
        <div className="flex-1">
          <p className="text-[13.5px] font-semibold" style={{ color: 'var(--color-text)' }}>
            Modelos recomendados
          </p>
          <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-soft)' }}>
            Quanto maior, melhor a qualidade — mas consome mais RAM.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-full mb-3 w-fit"
        style={{ background: 'var(--color-surface-2)' }}
      >
        {(['chat', 'embedding'] as const).map(t => {
          const active = tab === t
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1 rounded-full text-[11.5px] font-medium transition-all"
              style={{
                background: active ? 'var(--color-surface)' : 'transparent',
                color: active ? 'var(--color-text)' : 'var(--color-text-soft)',
                boxShadow: active ? '0 1px 2px rgba(15,16,20,0.06)' : 'none',
              }}
            >
              {t === 'chat' ? 'Chat (LLM)' : 'Embeddings'}
            </button>
          )
        })}
      </div>

      {/* Model list */}
      <div className="space-y-1.5">
        {models.map(m => (
          <div
            key={m.name}
            className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors"
            style={{ background: 'var(--color-bg)' }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <code
                  className="text-[12px] font-mono"
                  style={{ color: 'var(--color-text)' }}
                >
                  {m.name}
                </code>
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-soft)' }}
                >
                  {m.size}
                </span>
                {m.badge && (
                  <span
                    className="text-[9.5px] tracking-wider uppercase font-mono px-1.5 py-0.5 rounded-full"
                    style={{
                      background:
                        m.badge === 'recomendado' ? 'var(--color-accent-soft)' :
                        m.badge === 'leve'         ? 'var(--color-surface-2)' :
                        'var(--color-surface-2)',
                      color:
                        m.badge === 'recomendado' ? 'var(--color-accent-deep)' :
                        'var(--color-text-soft)',
                    }}
                  >
                    {m.badge}
                  </span>
                )}
              </div>
              <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {m.desc}
              </p>
            </div>
            <button
              onClick={() => copyCommand(m.pull)}
              className="shrink-0 flex items-center gap-1 text-[11px] font-mono px-2.5 py-1.5 rounded-md transition-colors"
              style={{
                color: copiedCmd === m.pull ? 'var(--color-accent)' : 'var(--color-text-soft)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
              }}
              title={m.pull}
            >
              {copiedCmd === m.pull ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedCmd === m.pull ? 'copiado' : 'copiar pull'}
            </button>
          </div>
        ))}
      </div>

    </div>
  )
}
