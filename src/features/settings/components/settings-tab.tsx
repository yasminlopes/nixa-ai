'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Check, ShieldCheck } from 'lucide-react'
import { type Provider } from '@/core/providers'
import { ProviderIcon } from '@/shared/components/provider-icon'
import { useIsHosted } from '@/shared/hooks/use-is-hosted'
import { SectionHeader } from './section-header'
import { OllamaModelsCard } from './ollama-models-card'

type SettingsPayload = {
  defaultProvider: Provider
  hasKeys: Record<Provider, boolean>
  updatedAt: string | null
  message?: string
}

const PROVIDERS: Array<{ id: Provider; label: string; placeholder: string }> = [
  { id: 'gemini', label: 'Google Gemini', placeholder: 'AIza...' },
  { id: 'openai', label: 'OpenAI (GPT)', placeholder: 'sk-...' },
  { id: 'ollama', label: 'Ollama (local)', placeholder: 'Sem chave — define OLLAMA_BASE_URL no .env' },
]

type SaveStatus = 'idle' | 'saving' | 'saved'

export function SettingsTab() {
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [defaultProvider, setDefaultProvider] = useState<Provider>('gemini')
  const [initialProvider, setInitialProvider] = useState<Provider>('gemini')
  const [hasKeys, setHasKeys] = useState<Record<Provider, boolean>>({ gemini: false, openai: false, ollama: true })
  const [keyValue, setKeyValue] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/settings')
        const data = (await res.json()) as SettingsPayload
        if (!res.ok) throw new Error(data.message ?? 'Falha ao carregar configurações')
        if (!mounted) return
        setDefaultProvider(data.defaultProvider)
        setInitialProvider(data.defaultProvider)
        setHasKeys(data.hasKeys)
        setUpdatedAt(data.updatedAt)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Falha ao carregar configurações')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  function selectProvider(p: Provider) {
    setDefaultProvider(p)
    setKeyValue('')
    setError(null)
    setSaveStatus('idle')
  }

  function onKeyChange(value: string) {
    setKeyValue(value)
    if (saveStatus === 'saved') setSaveStatus('idle')
  }

  const hasChanges =
    defaultProvider !== initialProvider ||
    keyValue.trim().length > 0

  async function handleSave() {
    if (!hasChanges) return
    setSaveStatus('saving')
    setError(null)
    try {
      const apiKeys = keyValue.trim() ? { [defaultProvider]: keyValue.trim() } : {}
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultProvider, apiKeys }),
      })
      const data = (await res.json()) as SettingsPayload
      if (!res.ok) throw new Error(data.message ?? 'Falha ao salvar configurações')
      setHasKeys(data.hasKeys)
      setUpdatedAt(data.updatedAt)
      setKeyValue('')
      setInitialProvider(defaultProvider)
      setSaveStatus('saved')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar configurações')
      setSaveStatus('idle')
    }
  }

  const current = PROVIDERS.find(p => p.id === defaultProvider)!
  const isOllama = defaultProvider === 'ollama'
  const isHosted = useIsHosted()
  const saveDisabled = loading || saveStatus === 'saving' || saveStatus === 'saved' || !hasChanges

  return (
    <div>
      <SectionHeader
        eyebrow="Provedores"
        title="LLM e chaves."
        subtitle="Escolha o modelo padrão e configure as chaves criptografadas."
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
          Chaves criptografadas com{' '}
          <span style={{ color: 'var(--color-text)' }} className="font-medium">AES-256-GCM</span> no servidor.
          {updatedAt && (
            <span style={{ color: 'var(--color-text-muted)' }}>
              {' '}· salvo em {new Date(updatedAt).toLocaleString('pt-BR')}
            </span>
          )}
        </span>
      </div>

      {error && <p className="mt-3 text-[12.5px]" style={{ color: 'var(--color-accent)' }}>{error}</p>}

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
          {saveStatus === 'saving' && (
            <>
              <span
                className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin"
                style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#FFFFFF' }}
              />
              Salvando…
            </>
          )}
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
