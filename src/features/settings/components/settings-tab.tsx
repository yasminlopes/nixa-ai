'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Check, ShieldCheck } from 'lucide-react'
import { type Provider } from '@/core/providers'
import { ProviderIcon } from '@/shared/components/provider-icon'
import { useIsHosted } from '@/shared/hooks/use-is-hosted'
import { getStoredSettings, saveStoredSettings, hasKey } from '@/shared/utils/llm-settings-storage'
import { SectionHeader } from './section-header'
import { OllamaModelsCard } from './ollama-models-card'

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

      <div className="flex flex-wrap gap-2 mb-6">
        {PROVIDERS.map(p => {
          const active = defaultProvider === p.id
          return (
            <button
              key={p.id}
              onClick={() => selectProvider(p.id)}
              className="relative flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-all"
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
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: active ? 'rgba(255,255,255,0.7)' : 'var(--color-accent)' }}
                />
              )}
            </button>
          )
        })}
      </div>

      <div
        className="rounded-[16px] p-5 space-y-3"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ProviderIcon provider={defaultProvider} />
            <span className="text-[13.5px] font-medium" style={{ color: 'var(--color-text)' }}>
              {current.label}
            </span>
          </div>
          <span
            className="text-[10px] tracking-wider uppercase font-mono px-2 py-0.5 rounded-full"
            style={{
              background: 'var(--color-surface-2)',
              color: hasKeys[defaultProvider] ? 'var(--color-accent)' : 'var(--color-text-muted)',
            }}
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
            className="w-full rounded-[10px] px-3 py-2.5 text-[13.5px] outline-none transition-colors"
            style={{
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
          />
        )}

        {isOllama && (
          <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--color-text-soft)' }}>
            Ollama roda local, sem chave. Apenas certifique que{' '}
            <code className="font-mono text-[11.5px] px-1.5 py-0.5 rounded"
              style={{ background: 'var(--color-surface-2)' }}>ollama serve</code>
            {' '}está rodando.
          </p>
        )}
      </div>

      {isOllama && isHosted && (
        <div
          className="mt-4 rounded-[14px] px-4 py-3.5"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
            <div className="min-w-0">
              <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--color-text-soft)' }}>
                <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                  O Ollama só funciona rodando o projeto na sua máquina.
                </span>{' '}
                Na versão hospedada, o servidor não alcança o{' '}
                <code className="font-mono text-[11.5px] px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--color-surface)' }}>localhost</code>
                {' '}do seu computador — use Gemini ou OpenAI. Para usar 100% local e sem custo, clone o repositório.
                O projeto é open source, contribuições são bem-vindas!
              </p>
              <a
                href="https://github.com/yasminlopes/nixa-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'var(--color-ink)', color: 'var(--color-ink-text)' }}
              >
                Ver no GitHub
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Ollama help card — modelos recomendados */}
      {isOllama && <OllamaModelsCard />}

      <div
        className="mt-4 flex items-start gap-2 rounded-[10px] px-3 py-2.5 text-[11.5px]"
        style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-soft)',
        }}
      >
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--color-text-muted)' }} />
        <span>
          Salvo só neste navegador (localStorage) — nunca compartilhado com outros visitantes do site.
          {updatedAt && (
            <span style={{ color: 'var(--color-text-muted)' }}>
              {' '}· salvo em {new Date(updatedAt).toLocaleString('pt-BR')}
            </span>
          )}
        </span>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saveDisabled}
          className="rounded-full px-5 py-2 text-[13px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center gap-1.5"
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
              <Check className="w-3.5 h-3.5" strokeWidth={2.75} />
              Salvo
            </>
          )}
          {saveStatus === 'idle' && (hasChanges ? 'Salvar' : 'Sem alterações')}
        </button>
      </div>
    </div>
  )
}
