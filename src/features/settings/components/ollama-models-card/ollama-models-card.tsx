'use client'

import { useState } from 'react'
import { Check, Copy, Zap, Brain, Laptop } from 'lucide-react'
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

const USAGE_GUIDE = [
  { icon: Zap,    label: 'Respostas rápidas',  model: 'llama3.2:1b' },
  { icon: Brain,  label: 'Melhor qualidade',   model: 'llama3.1' },
  { icon: Laptop, label: 'Máquinas simples',   model: 'qwen2.5:0.5b' },
]

export function OllamaModelsCard() {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)
  const [tab, setTab] = useState<'chat' | 'embedding'>('chat')

  async function copyCommand(cmd: string) {
    await navigator.clipboard.writeText(cmd)
    setCopiedCmd(cmd)
    setTimeout(() => setCopiedCmd(null), 1800)
  }

  const models = OLLAMA_MODELS.filter(model => model.category === tab)

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <LlamaIcon size={18} />
        </div>
        <div className={styles.headerBody}>
          <p className={styles.headerTitle}>Modelos recomendados</p>
          <p className={styles.headerSubtitle}>
            Baixe com <code className={styles.headerCode}>ollama pull</code> e defina em{' '}
            <code className={styles.headerCode}>OLLAMA_MODEL</code>. Quanto maior, melhor a qualidade — e mais RAM.
          </p>
        </div>
      </div>

      <div className={styles.tabs}>
        {(['chat', 'embedding'] as const).map(tabId => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            className={clsx(styles.tab, tab === tabId && styles.tabActive)}
          >
            {tabId === 'chat' ? 'Chat (LLM)' : 'Embeddings'}
          </button>
        ))}
      </div>

      {tab === 'chat' && (
        <div className={styles.usageGuide}>
          {USAGE_GUIDE.map(({ icon: Icon, label, model }) => (
            <div key={model} className={styles.usageItem}>
              <Icon size={15} className={styles.usageIcon} aria-hidden="true" />
              <span className={styles.usageLabel}>{label}</span>
              <code className={styles.usageModel}>{model}</code>
            </div>
          ))}
        </div>
      )}

      <div className={styles.list}>
        {models.map(model => (
          <div key={model.name} className={styles.item}>
            <div className={styles.itemBody}>
              <div className={styles.itemHead}>
                <code className={styles.itemName}>{model.name}</code>
                <span className={styles.itemSize}>{model.size}</span>
                {model.badge && (
                  <span className={clsx(styles.itemBadge, model.badge === 'recomendado' && styles.itemBadgeRecommended)}>
                    {model.badge}
                  </span>
                )}
              </div>
              <p className={styles.itemDesc}>{model.desc}</p>
            </div>
            <button
              onClick={() => copyCommand(model.pull)}
              className={clsx(styles.copyButton, copiedCmd === model.pull && styles.copyButtonActive)}
              title={model.pull}
            >
              {copiedCmd === model.pull ? <Check size={12} /> : <Copy size={12} />}
              {copiedCmd === model.pull ? 'copiado' : 'copiar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
