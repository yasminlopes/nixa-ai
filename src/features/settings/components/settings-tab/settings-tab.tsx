'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Check, ShieldCheck, X } from 'lucide-react'
import { type Provider } from '@/core/providers'
import { ProviderIcon } from '@/shared/components/provider-icon'
import { useIsHosted } from '@/shared/hooks/use-is-hosted'
import { fetchSettings, updateSettings, removeApiKey } from '@/shared/services/settings-service'
import { saveStoredProvider } from '@/shared/utils/llm-settings-storage'
import { SectionHeader } from '../section-header'
import { OllamaModelsCard } from '../ollama-models-card'
import styles from './settings-tab.module.scss'

const PROVIDERS: Array<{ id: Provider; label: string; placeholder: string }> = [
  { id: 'gemini', label: 'Google Gemini', placeholder: 'AIza...' },
  { id: 'openai', label: 'OpenAI (GPT)', placeholder: 'sk-...' },
  { id: 'ollama', label: 'Ollama (local)', placeholder: 'Sem chave — define OLLAMA_BASE_URL no .env' },
]

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function SettingsTab() {
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [defaultProvider, setDefaultProvider] = useState<Provider>('gemini')
  const [initialProvider, setInitialProvider] = useState<Provider>('gemini')
  const [hasKeys, setHasKeys] = useState<Record<Provider, boolean>>({ gemini: false, openai: false, ollama: true })
  const [maskedKeys, setMaskedKeys] = useState<Partial<Record<Provider, string>>>({})
  const [keyValue, setKeyValue] = useState('')

  async function loadSettings() {
    const settings = await fetchSettings()
    setDefaultProvider(settings.defaultProvider)
    setInitialProvider(settings.defaultProvider)
    setUpdatedAt(settings.updatedAt)
    setHasKeys(settings.hasKeys)
    setMaskedKeys(settings.maskedKeys)
    setLoading(false)
  }

  useEffect(() => { loadSettings() }, [])

  function selectProvider(p: Provider) {
    setDefaultProvider(p)
    setKeyValue('')
    setSaveStatus('idle')
    setError(null)
  }

  function onKeyChange(value: string) {
    setKeyValue(value)
    if (saveStatus !== 'idle') setSaveStatus('idle')
  }

  const hasChanges =
    defaultProvider !== initialProvider ||
    keyValue.trim().length > 0

  async function handleSave() {
    if (!hasChanges) return
    setSaveStatus('saving')
    setError(null)
    try {
      const apiKeys = keyValue.trim() ? { [defaultProvider]: keyValue.trim() } : undefined
      const saved = await updateSettings({ defaultProvider, apiKeys })
      saveStoredProvider(defaultProvider)
      setUpdatedAt(saved.updatedAt)
      setHasKeys(saved.hasKeys)
      setMaskedKeys(saved.maskedKeys)
      setKeyValue('')
      setInitialProvider(defaultProvider)
      setSaveStatus('saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar configurações')
      setSaveStatus('error')
    }
  }

  async function handleRemoveKey() {
    setError(null)
    try {
      const saved = await removeApiKey(defaultProvider)
      setHasKeys(saved.hasKeys)
      setMaskedKeys(saved.maskedKeys)
      setUpdatedAt(saved.updatedAt)
      setKeyValue('')
      setSaveStatus('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao remover a chave')
    }
  }

  const current = PROVIDERS.find(p => p.id === defaultProvider)!
  const isOllama = defaultProvider === 'ollama'
  const isHosted = useIsHosted()
  const saveDisabled = loading || saveStatus === 'saving' || saveStatus === 'saved' || !hasChanges
  const maskedKey = maskedKeys[defaultProvider]

  return (
    <div>
      <SectionHeader
        eyebrow="Provedores"
        title="LLM e chaves."
        subtitle="Escolha o modelo padrão e configure as chaves — armazenadas criptografadas no servidor."
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
          <>
            <input
              type="password"
              value={keyValue}
              onChange={e => onKeyChange(e.target.value)}
              placeholder={maskedKey ?? current.placeholder}
              className={styles.keyInput}
              autoComplete="off"
            />
            {hasKeys[defaultProvider] && (
              <div className={styles.keyStatusRow}>
                <span className={styles.keyStatusText}>
                  Chave atual: <code className={styles.inlineCode}>{maskedKey}</code>
                </span>
                <button onClick={handleRemoveKey} className={styles.removeKeyButton} type="button">
                  <X className="w-3 h-3" />
                  Remover
                </button>
              </div>
            )}
          </>
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
          Chaves criptografadas (AES-256-GCM) e armazenadas só no servidor — nunca trafegam de volta pro navegador.
          {updatedAt && (
            <span className={styles.footerNoticeMuted}>
              {' '}· salvo em {new Date(updatedAt).toLocaleString('pt-BR')}
            </span>
          )}
        </span>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

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
          {saveStatus === 'saving' && 'Salvando…'}
          {saveStatus === 'saved' && (
            <>
              <Check size={14} strokeWidth={2.75} />
              Salvo
            </>
          )}
          {(saveStatus === 'idle' || saveStatus === 'error') && (hasChanges ? 'Salvar' : 'Sem alterações')}
        </button>
      </div>
    </div>
  )
}
