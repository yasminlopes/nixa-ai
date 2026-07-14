'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import clsx from 'clsx'
import { LlamaIcon } from '@/shared/components/llama-icon'
import styles from './ollama-models-card.module.scss'

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
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <LlamaIcon size={18} />
        </div>
        <div className={styles.headerBody}>
          <p className={styles.headerTitle}>Modelos recomendados</p>
          <p className={styles.headerSubtitle}>Quanto maior, melhor a qualidade — mas consome mais RAM.</p>
        </div>
      </div>

      <div className={styles.tabs}>
        {(['chat', 'embedding'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(styles.tab, tab === t && styles.tabActive)}
          >
            {t === 'chat' ? 'Chat (LLM)' : 'Embeddings'}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {models.map(m => (
          <div key={m.name} className={styles.item}>
            <div className={styles.itemBody}>
              <div className={styles.itemHead}>
                <code className={styles.itemName}>{m.name}</code>
                <span className={styles.itemSize}>{m.size}</span>
                {m.badge && (
                  <span className={clsx(styles.itemBadge, m.badge === 'recomendado' && styles.itemBadgeRecommended)}>
                    {m.badge}
                  </span>
                )}
              </div>
              <p className={styles.itemDesc}>{m.desc}</p>
            </div>
            <button
              onClick={() => copyCommand(m.pull)}
              className={clsx(styles.copyButton, copiedCmd === m.pull && styles.copyButtonActive)}
              title={m.pull}
            >
              {copiedCmd === m.pull ? <Check size={12} /> : <Copy size={12} />}
              {copiedCmd === m.pull ? 'copiado' : 'copiar pull'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
