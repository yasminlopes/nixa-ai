'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Check, ShieldCheck } from 'lucide-react'
import { type Provider } from '@/core/providers'
import { ProviderIcon } from '@/shared/components/provider-icon'
import { useIsHosted } from '@/shared/hooks/use-is-hosted'
import { getStoredSettings, saveStoredSettings, hasKey } from '@/shared/utils/llm-settings-storage'
import { SectionHeader } from '../section-header'
import { OllamaModelsCard } from '../ollama-models-card'
import styles from './settings-tab.module.scss'

const PROVIDERS: Array<{ id: Provider; label: string; placeholder: string }> = [
  { id: 'gemini', label: 'Google Gemini', placeholder: 'AIza...' },
  { id: 'openai', label: 'OpenAI (GPT)', placeholder: 'sk-...' },
  { id: 'ollama', label: 'Ollama (local)', placeholder: 'Sem chave — define OLLAMA_BASE_URL no .env' },
]

type SaveStatus = 'idle' | 'saved'

export function SettingsTab() {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [defaultProvider, setDefaultProvider] = useState<Provider>('gemini')
  const [initialProvider, setInitialProvider] = useState<Provider>('gemini')
  const [hasKeys, setHasKeys] = useState<Record<Provider, boolean>>({ gemini: false, openai: false, ollama: true })
  const [keyValue, setKeyValue] = useState('')

  useEffect(() => {
    const stored = getStoredSettings()
    setDefaultProvider(stored.defaultProvider)
    setInitialProvider(stored.defaultProvider)
    setUpdatedAt(stored.updatedAt)
    setHasKeys({
      gemini: hasKey('gemini'),
      openai: hasKey('openai'),
      ollama: true,
    })
  }, [])

  function selectProvider(p: Provider) {
    setDefaultProvider(p)
    setKeyValue('')
    setSaveStatus('idle')
  }

  function onKeyChange(value: string) {
    setKeyValue(value)
    if (saveStatus === 'saved') setSaveStatus('idle')
  }

  const hasChanges =
    defaultProvider !== initialProvider ||
    keyValue.trim().length > 0

  function handleSave() {
    if (!hasChanges) return
    const apiKeys = keyValue.trim() ? { [defaultProvider]: keyValue.trim() } : {}
    const saved = saveStoredSettings({ defaultProvider, apiKeys })
    setUpdatedAt(saved.updatedAt)
    setHasKeys({
      gemini: hasKey('gemini'),
      openai: hasKey('openai'),
      ollama: true,
    })
    setKeyValue('')
    setInitialProvider(defaultProvider)
    setSaveStatus('saved')
  }

  const current = PROVIDERS.find(p => p.id === defaultProvider)!
  const isOllama = defaultProvider === 'ollama'
  const isHosted = useIsHosted()
  const saveDisabled = saveStatus === 'saved' || !hasChanges

  return (
    <div>
      <SectionHeader
        eyebrow="Provedores"
        title="LLM e chaves."
        subtitle="Escolha o modelo padrão e configure as chaves — salvas só neste navegador."
      />

      <div className={styles.providerChips}>
        {PROVIDERS.map(p => {
          const active = defaultProvider === p.id
          return (
            <button
              key={p.id}
              onClick={() => selectProvider(p.id)}
              className={styles.chip}
              style={{
                background: active ? 'var(--color-accent)' : 'var(--color-surface)',
                color: active ? '#FFFFFF' : 'var(--color-text-soft)',
                border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
            >
              <ProviderIcon provider={p.id} />
              {p.label}
              {hasKeys[p.id] && (
                <span
                  className={styles.chipDot}
                  style={{ background: active ? 'rgba(255,255,255,0.7)' : 'var(--color-accent)' }}
                />
              )}
            </button>
          )
        })}
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <ProviderIcon provider={defaultProvider} />
            <span className={styles.cardHeaderLabel}>{current.label}</span>
          </div>
          <span
            className={styles.statusBadge}
            style={{ color: hasKeys[defaultProvider] ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
          >
            {hasKeys[defaultProvider] ? (isOllama ? 'local' : 'chave salva') : 'sem chave'}
          </span>
        </div>

        {!isOllama && (
          <input
            type="password"
            value={keyValue}
            onChange={e => onKeyChange(e.target.value)}
            placeholder={hasKeys[defaultProvider] ? '••••••••• (deixe vazio para manter)' : current.placeholder}
            className={styles.keyInput}
          />
        )}

        {isOllama && (
          <p className={styles.ollamaHint}>
            Ollama roda local, sem chave. Apenas certifique que{' '}
            <code className={styles.inlineCode}>ollama serve</code>
            {' '}está rodando.
          </p>
        )}
      </div>

      {isOllama && isHosted && (
        <div className={styles.hostedNotice}>
          <div className={styles.hostedNoticeInner}>
            <AlertTriangle className={styles.hostedNoticeIcon} />
            <div>
              <p className={styles.hostedNoticeText}>
                <span className={styles.hostedNoticeStrong}>
                  O Ollama só funciona rodando o projeto na sua máquina.
                </span>{' '}
                Na versão hospedada, o servidor não alcança o{' '}
                <code className={styles.inlineCode}>localhost</code>
                {' '}do seu computador — use Gemini ou OpenAI. Para usar 100% local e sem custo, clone o repositório.
                O projeto é open source, contribuições são bem-vindas!
              </p>
              <a
                href="https://github.com/yasminlopes/nixa-ai"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.githubButton}
              >
                Ver no GitHub
              </a>
            </div>
          </div>
        </div>
      )}

      {isOllama && <OllamaModelsCard />}

      <div className={styles.footerNotice}>
        <ShieldCheck className={styles.footerNoticeIcon} />
        <span>
          Salvo só neste navegador (localStorage) — nunca compartilhado com outros visitantes do site.
          {updatedAt && (
            <span className={styles.footerNoticeMuted}>
              {' '}· salvo em {new Date(updatedAt).toLocaleString('pt-BR')}
            </span>
          )}
        </span>
      </div>

      <div className={styles.submitRow}>
        <button
          onClick={handleSave}
          disabled={saveDisabled}
          className={styles.saveButton}
          style={{
            background:
              saveStatus === 'saved' ? 'var(--color-surface-2)' :
              !hasChanges            ? 'var(--color-surface-2)' :
              'var(--color-accent)',
            color:
              saveStatus === 'saved' ? 'var(--color-accent)' :
              !hasChanges            ? 'var(--color-text-muted)' :
              '#FFFFFF',
            border: saveStatus === 'saved' || !hasChanges
              ? '1px solid var(--color-border)'
              : '1px solid transparent',
          }}
        >
          {saveStatus === 'saved' && (
            <>
              <Check size={14} strokeWidth={2.75} />
              Salvo
            </>
          )}
          {saveStatus === 'idle' && (hasChanges ? 'Salvar' : 'Sem alterações')}
        </button>
      </div>
    </div>
  )
}
