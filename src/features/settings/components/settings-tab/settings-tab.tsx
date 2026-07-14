'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Lock, Trash2, Server, Cpu } from 'lucide-react'
import clsx from 'clsx'
import { type Provider } from '@/core/providers'
import { ProviderIcon } from '@/shared/components/provider-icon'
import { useIsHosted } from '@/shared/hooks/use-is-hosted'
import {
  getKeyStatus,
  getMaskedKey,
  setApiKey,
  removeApiKey as removeStoredKey,
  getKeysUpdatedAt,
} from '@/shared/utils/api-key-storage'
import { getStoredProvider, saveStoredProvider } from '@/shared/utils/llm-settings-storage'
import { SectionHeader } from '../section-header'
import { OllamaModelsCard } from '../ollama-models-card'
import styles from './settings-tab.module.scss'

type ProviderMeta = { id: Provider; name: string; type: 'Cloud' | 'Local'; placeholder: string }

const PROVIDERS: ProviderMeta[] = [
  { id: 'gemini', name: 'Gemini', type: 'Cloud', placeholder: 'AIza...' },
  { id: 'openai', name: 'OpenAI', type: 'Cloud', placeholder: 'sk-...' },
  { id: 'ollama', name: 'Ollama', type: 'Local', placeholder: '' },
]

const OLLAMA_DEFAULT_SERVER = 'localhost:11434'
const OLLAMA_DEFAULT_MODEL = 'llama3.2:1b'

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

  function buildMaskedKeys(): Partial<Record<Provider, string>> {
    const masked: Partial<Record<Provider, string>> = {}
    for (const provider of ['gemini', 'openai'] as Provider[]) {
      const value = getMaskedKey(provider)
      if (value) masked[provider] = value
    }
    return masked
  }

  function loadSettings() {
    const stored = getStoredProvider() ?? 'gemini'
    setDefaultProvider(stored)
    setInitialProvider(stored)
    setUpdatedAt(getKeysUpdatedAt())
    setHasKeys(getKeyStatus())
    setMaskedKeys(buildMaskedKeys())
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

  const hasChanges = defaultProvider !== initialProvider || keyValue.trim().length > 0

  function handleCancel() {
    setDefaultProvider(initialProvider)
    setKeyValue('')
    setSaveStatus('idle')
    setError(null)
  }

  function handleSave() {
    if (!hasChanges) return
    setSaveStatus('saving')
    setError(null)
    try {
      if (keyValue.trim()) setApiKey(defaultProvider, keyValue.trim())
      saveStoredProvider(defaultProvider)
      setUpdatedAt(getKeysUpdatedAt())
      setHasKeys(getKeyStatus())
      setMaskedKeys(buildMaskedKeys())
      setKeyValue('')
      setInitialProvider(defaultProvider)
      setSaveStatus('saved')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Falha ao salvar configurações')
      setSaveStatus('error')
    }
  }

  function handleRemoveKey() {
    setError(null)
    try {
      removeStoredKey(defaultProvider)
      setHasKeys(getKeyStatus())
      setMaskedKeys(buildMaskedKeys())
      setUpdatedAt(getKeysUpdatedAt())
      setKeyValue('')
      setSaveStatus('idle')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Falha ao remover a chave')
    }
  }

  const current = PROVIDERS.find(provider => provider.id === defaultProvider)!
  const isOllama = defaultProvider === 'ollama'
  const isHosted = useIsHosted()
  const maskedKey = maskedKeys[defaultProvider]

  function providerStatus(id: Provider): { label: string; tone: 'connected' | 'none' | 'local' } {
    if (id === 'ollama') return { label: 'Local', tone: 'local' }
    return hasKeys[id] ? { label: 'Conectado', tone: 'connected' } : { label: 'Sem chave', tone: 'none' }
  }

  return (
    <div className={styles.wrapper}>
      <SectionHeader
        eyebrow="Nixa AI"
        title="Modelos de IA."
        subtitle="Configure qual inteligência a Nixa utiliza para gerar respostas."
      />

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Provedor</p>
        <div className={styles.providerGrid}>
          {PROVIDERS.map(provider => {
            const active = defaultProvider === provider.id
            const status = providerStatus(provider.id)
            return (
              <button
                key={provider.id}
                onClick={() => selectProvider(provider.id)}
                className={clsx(styles.providerCard, active && styles.providerCardActive)}
                aria-pressed={active}
              >
                <span className={styles.providerCardTop}>
                  <ProviderIcon provider={provider.id} />
                  <span className={styles.providerName}>{provider.name}</span>
                </span>
                <span className={styles.providerType}>{provider.type}</span>
                <span className={styles.providerStatus}>
                  <span className={clsx(styles.dot, styles[`dot_${status.tone}`])} />
                  {status.label}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Configuração</p>

        {!isOllama && (
          <div className={styles.card}>
            <div className={styles.configHead}>
              <ProviderIcon provider={defaultProvider} />
              <span className={styles.configTitle}>{current.name}</span>
            </div>
            <label className={styles.fieldLabel} htmlFor="api-key">API Key</label>
            <input
              id="api-key"
              type="password"
              value={keyValue}
              onChange={e => onKeyChange(e.target.value)}
              placeholder={maskedKey ?? current.placeholder}
              className={styles.keyInput}
              autoComplete="off"
            />
            {hasKeys[defaultProvider] && (
              <div className={styles.keyStatusRow}>
                <span className={styles.keyConfigured}>
                  <Check size={13} strokeWidth={2.75} />
                  Chave configurada
                </span>
                <button onClick={handleRemoveKey} className={styles.removeKeyButton} type="button">
                  <Trash2 size={13} />
                  Remover
                </button>
              </div>
            )}
          </div>
        )}

        {isOllama && (
          <div className={styles.card}>
            <div className={styles.configHead}>
              <span className={styles.ollamaStatus}>
                <span className={clsx(styles.dot, styles.dot_local)} />
                Ollama · local
              </span>
            </div>
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <Server size={14} className={styles.infoIcon} />
                <span className={styles.infoKey}>Servidor</span>
                <code className={styles.infoValue}>{OLLAMA_DEFAULT_SERVER}</code>
                <span className={styles.infoHint}>padrão</span>
              </div>
              <div className={styles.infoRow}>
                <Cpu size={14} className={styles.infoIcon} />
                <span className={styles.infoKey}>Modelo</span>
                <code className={styles.infoValue}>{OLLAMA_DEFAULT_MODEL}</code>
                <span className={styles.infoHint}>padrão</span>
              </div>
            </div>
            <p className={styles.ollamaHint}>
              Roda 100% local, sem chave. Basta ter o <code className={styles.inlineCode}>ollama serve</code> ativo.
            </p>
          </div>
        )}
      </section>

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

      {isOllama && (
        <section className={styles.section}>
          <OllamaModelsCard />
        </section>
      )}

      <div className={styles.securityNotice}>
        <Lock className={styles.securityIcon} />
        <span>
          Suas chaves ficam cifradas no seu navegador e são enviadas direto ao provedor — nunca ficam salvas no servidor.
          {updatedAt && (
            <span className={styles.securityMuted}>
              {' '}· salvo em {new Date(updatedAt).toLocaleString('pt-BR')}
            </span>
          )}
        </span>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      <div className={styles.actionBar}>
        <span className={styles.actionStatus}>
          {saveStatus === 'saved' && !hasChanges ? (
            <><Check size={14} strokeWidth={2.75} className={styles.actionStatusSaved} /> Tudo salvo</>
          ) : hasChanges ? (
            <><span className={styles.actionStatusDot} /> Alterações pendentes</>
          ) : (
            <span className={styles.actionStatusMuted}>Nenhuma alteração</span>
          )}
        </span>
        <div className={styles.actionButtons}>
          <button
            onClick={handleCancel}
            disabled={!hasChanges || saveStatus === 'saving'}
            className={styles.cancelButton}
            type="button"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saveStatus === 'saving' || !hasChanges}
            className={styles.saveButton}
            type="button"
          >
            {saveStatus === 'saving' ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
