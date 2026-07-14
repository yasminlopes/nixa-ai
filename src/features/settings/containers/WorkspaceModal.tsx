'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  BookOpen,
  Settings,
  User,
  AlertTriangle,
  CheckCircle2,
  Database,
  ShieldCheck,
  Layers,
  Check,
  Copy,
} from 'lucide-react'
import { type Provider } from '@/core/providers'
import { ProviderIcon } from '@/shared/components/ProviderIcon'
import { LlamaIcon } from '@/shared/components/LlamaIcon'
import { ThemeToggle } from '@/shared/components/ThemeToggle'

export type WorkspaceTab = 'profile' | 'index' | 'settings' | 'about'

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

const TABS: Array<{ id: WorkspaceTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'profile',  label: 'Perfil',        icon: User },
  { id: 'index',    label: 'Indexação',     icon: BookOpen },
  { id: 'settings', label: 'LLM e chaves',  icon: Settings },
  { id: 'about',    label: 'Sobre',         icon: Layers },
]

interface WorkspaceModalProps {
  initialTab: WorkspaceTab
  onClose: () => void
}

export function WorkspaceModal({ initialTab, onClose }: WorkspaceModalProps) {
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<WorkspaceTab>(initialTab)
  const [isIndexing, setIsIndexing] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  useEffect(() => { setMounted(true); return () => setMounted(false) }, [])
  useEffect(() => { setTab(initialTab) }, [initialTab])

  function handleRequestClose() {
    if (isIndexing) { setShowCloseConfirm(true); return }
    onClose()
  }

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md p-4"
      style={{ background: 'rgba(15, 14, 12, 0.4)' }}
    >
      <div
        className="w-full max-w-6xl h-[90vh] overflow-hidden rounded-[22px]"
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 32px 80px -16px rgba(15,14,12,0.45)',
        }}
      >
        <div className="h-full grid grid-cols-1 md:grid-cols-[260px_1fr]">

          {/* Nav sidebar */}
          <aside
            className="p-4 flex flex-col"
            style={{
              background: 'var(--color-surface-2)',
              borderRight: '1px solid var(--color-border)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-baseline gap-2">
                <span className="font-display font-semibold text-[18px] tracking-tight" style={{ color: 'var(--color-text)' }}>
                  Ajustes
                </span>
              </div>
              <button
                onClick={handleRequestClose}
                className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--color-hover)'
                  e.currentTarget.style.color = 'var(--color-text)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--color-text-muted)'
                }}
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="space-y-1 flex-1">
              {TABS.map(item => {
                const Icon = item.icon
                const active = tab === item.id
                const locked = isIndexing && item.id !== 'index'
                return (
                  <button
                    key={item.id}
                    onClick={() => !locked && setTab(item.id)}
                    disabled={locked}
                    title={locked ? 'Indisponível durante a indexação' : undefined}
                    className="w-full flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] transition-colors"
                    style={{
                      background: active ? 'var(--color-surface)' : 'transparent',
                      color: active ? 'var(--color-text)' : 'var(--color-text-soft)',
                      boxShadow: active ? '0 0 0 1px var(--color-border)' : 'none',
                      opacity: locked ? 0.4 : 1,
                      cursor: locked ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={e => { if (!active && !locked) e.currentTarget.style.background = 'var(--color-surface)' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                  >
                    {active && (
                      <span className="w-[2px] self-stretch rounded-full" style={{ background: 'var(--color-accent)' }} />
                    )}
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {item.label}
                  </button>
                )
              })}
            </nav>

            <div
              className="mt-4 pt-4 px-1 flex items-center justify-between"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <span className="text-[10px] tracking-[0.18em] uppercase font-mono" style={{ color: 'var(--color-text-muted)' }}>
                Tema
              </span>
              <ThemeToggle />
            </div>
          </aside>

          {/* Content */}
          <section className="h-full overflow-y-auto p-8">
            {tab === 'profile'  && <ProfileTab />}
            {tab === 'index'    && <IndexTab onRunningChange={setIsIndexing} />}
            {tab === 'settings' && <SettingsTab />}
            {tab === 'about'    && <AboutTab />}
          </section>
        </div>
      </div>

      {/* Close confirm */}
      {showCloseConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(15, 14, 12, 0.4)' }}
        >
          <div
            className="w-full max-w-md rounded-[18px] overflow-hidden"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 24px 60px -12px rgba(15,14,12,0.4)',
            }}
          >
            <div
              className="px-6 py-5"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <h3 className="font-display font-semibold text-[22px] tracking-tight" style={{ color: 'var(--color-text)' }}>
                Interromper indexação?
              </h3>
            </div>
            <div className="px-6 py-4 text-[13.5px] leading-relaxed" style={{ color: 'var(--color-text-soft)' }}>
              A indexação está em andamento. Se fechar agora, o processo será interrompido.
            </div>
            <div
              className="px-6 py-4 flex justify-end gap-2"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="rounded-md px-4 py-2 text-[12.5px] transition-colors"
                style={{
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-soft)',
                }}
              >
                Continuar
              </button>
              <button
                onClick={() => { setShowCloseConfirm(false); onClose() }}
                className="rounded-md px-4 py-2 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-accent)' }}
              >
                Fechar mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      {eyebrow && (
        <p
          className="text-[10.5px] tracking-[0.18em] uppercase font-mono mb-3"
          style={{ color: 'var(--color-accent)' }}
        >
          {eyebrow}
        </p>
      )}
      <h2 className="font-display font-semibold text-[32px] sm:text-[38px] leading-[1.1] tracking-tight" style={{ color: 'var(--color-text)' }}>
        {title}
      </h2>
      {subtitle && (
        <p
          className="font-sans text-[16px] leading-relaxed mt-2 max-w-md"
          style={{ color: 'var(--color-text-soft)' }}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}

// ─── Index Tab ────────────────────────────────────────────────────────────────

function IndexTab({ onRunningChange }: { onRunningChange: (running: boolean) => void }) {
  const [logs, setLogs] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [chunkCount, setChunkCount] = useState(0)
  const [forceReindex, setForceReindex] = useState(false)
  const [reloadCountdown, setReloadCountdown] = useState<number | null>(null)
  const [hasWarnings, setHasWarnings] = useState(false)
  const logsRef = useRef<HTMLDivElement>(null)

  useEffect(() => { onRunningChange(running) }, [running, onRunningChange])

  useEffect(() => {
    if (!running) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [running])

  useEffect(() => {
    if (!done) return
    setReloadCountdown(5)
    const interval = setInterval(() => {
      setReloadCountdown(prev => {
        if (prev === null || prev <= 1) { clearInterval(interval); window.location.reload(); return null }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [done])

  async function startIndexing() {
    setRunning(true); setLogs([]); setDone(false); setChunkCount(0); setHasWarnings(false)
    try {
      const res = await fetch('/api/index-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxPages: 60, maxDepth: 2, staleDays: 14, force: forceReindex }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data:'))
        for (const line of lines) {
          try {
            const { msg } = JSON.parse(line.slice(5))
            setLogs(prev => [...prev, msg])
            if (msg.includes('⚠️') || msg.includes('rate limit') || msg.includes('indisponível')) setHasWarnings(true)
            const m = msg.match(/(\d+)\s+chunks\s+adicionados/i)
            if (m) setChunkCount(parseInt(m[1]))
            setTimeout(() => logsRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 50)
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      setLogs(prev => [...prev, `Erro: ${err instanceof Error ? err.message : String(err)}`])
    } finally {
      setRunning(false); setDone(true)
      if (chunkCount === 0) {
        try {
          const s = await fetch('/api/index-docs').then(r => r.json())
          if (s.count) setChunkCount(s.count)
        } catch { /* ignore */ }
      }
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Base de conhecimento"
        title="Indexar documentação."
        subtitle="Atualize a base de contexto da Nixa com as docs NICE/CXone."
      />

      {logs.length === 0 && !running ? (
        <div
          className="rounded-[16px] p-6"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <p className="text-[13.5px] mb-2" style={{ color: 'var(--color-text-soft)' }}>
            Vai crawlear e indexar as docs públicas:
          </p>
          <ul className="text-[13.5px] space-y-1 mb-5" style={{ color: 'var(--color-text)' }}>
            <li>· help.nicecxone.com</li>
            <li>· developer.niceincontact.com</li>
          </ul>

          <div
            className="rounded-[12px] p-3 flex gap-2"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-soft)' }}>
              Pode levar alguns minutos e consumir requests do provedor de embeddings. URLs já indexadas recentemente são puladas automaticamente.
            </p>
          </div>

          <label className="mt-5 flex items-center gap-3 cursor-pointer select-none w-fit">
            <button
              type="button"
              role="switch"
              aria-checked={forceReindex}
              onClick={() => setForceReindex(v => !v)}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              style={{ background: forceReindex ? 'var(--color-accent)' : 'var(--color-border-strong)' }}
            >
              <span
                className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                style={{ transform: forceReindex ? 'translateX(18px)' : 'translateX(2px)' }}
              />
            </button>
            <span className="text-[12px]" style={{ color: 'var(--color-text-soft)' }}>
              Forçar re-indexação completa <span style={{ color: 'var(--color-text-muted)' }}>(ignora cache)</span>
            </span>
          </label>
        </div>
      ) : (
        <>
          <div
            ref={logsRef}
            className="rounded-[14px] p-4 h-[380px] overflow-y-auto scrollbar-thin font-mono text-[11.5px]"
            style={{
              background: 'var(--color-ink)',
              color: 'var(--color-ink-text)',
            }}
          >
            {logs.map((log, i) => (
              <p key={i} className={
                log.startsWith('✅') ? 'text-emerald-300'
                : log.startsWith('❌') ? 'text-red-300'
                : log.startsWith('✓') ? 'text-emerald-200'
                : log.includes('⚠️') ? 'text-amber-300 font-semibold'
                : 'opacity-80'
              }>{log}</p>
            ))}
            {running && (
              <p className="opacity-60 animate-pulse" style={{ color: 'var(--color-accent)' }}>
                ▋ processando...
              </p>
            )}
          </div>

          {hasWarnings && running && (
            <div
              className="mt-3 flex items-start gap-3 rounded-[12px] px-4 py-3"
              style={{
                background: 'var(--color-accent-soft)',
                border: '1px solid var(--color-accent)',
              }}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-accent)' }} />
              <div>
                <p className="text-[13px] font-medium" style={{ color: 'var(--color-accent-deep)' }}>
                  Taxa de requisição atingida
                </p>
                <p className="text-[11.5px] mt-1" style={{ color: 'var(--color-text-soft)' }}>
                  O provedor de embeddings está limitando requisições. Retry automático em andamento.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {running && (
        <div
          className="mt-3 flex items-center gap-2 rounded-[10px] px-3 py-2.5"
          style={{ background: 'var(--color-accent-soft)', border: '1px solid var(--color-accent)' }}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-accent)' }} />
          <p className="text-[11.5px] font-medium" style={{ color: 'var(--color-accent-deep)' }}>
            Não feche nem troque de aba — a indexação será interrompida.
          </p>
        </div>
      )}

      {done && (
        <div
          className="mt-6 rounded-[18px] p-6 animate-fadeIn"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p
            className="text-[10.5px] tracking-[0.18em] uppercase font-mono mb-2"
            style={{ color: 'var(--color-accent)' }}
          >
            Concluído
          </p>
          <h3 className="font-display font-semibold text-[24px] leading-tight tracking-tight mb-2" style={{ color: 'var(--color-text)' }}>
            Tudo pronto.
          </h3>
          <p className="text-[13.5px]" style={{ color: 'var(--color-text-soft)' }}>
            Base de conhecimento atualizada com sucesso.
          </p>
          {chunkCount > 0 && (
            <div
              className="mt-4 flex items-center gap-2 rounded-md px-3 py-1.5 w-fit"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
            >
              <Database className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
              <span className="text-[13px] font-medium" style={{ color: 'var(--color-text)' }}>
                {chunkCount.toLocaleString('pt-BR')} chunks
              </span>
            </div>
          )}
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-full px-4 py-2 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--color-accent)' }}
            >
              Recarregar agora
            </button>
            {reloadCountdown !== null && (
              <span className="text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                recarregando em {reloadCountdown}s…
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={startIndexing}
          disabled={running}
          className="rounded-full px-5 py-2 text-[13px] font-medium text-white transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'var(--color-accent)' }}
        >
          {running ? 'Indexando…' : 'Iniciar indexação'}
        </button>
      </div>
    </div>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved'

function SettingsTab() {
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

// ─── Ollama models help card ─────────────────────────────────────────────────

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

function OllamaModelsCard() {
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

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(localStorage.getItem('nixa-user-name') ?? '')
    setAvatar(localStorage.getItem('nixa-user-avatar') ?? '')
  }, [])

  function saveProfile() {
    setSaving(true); setMessage(null); setError(null)
    try {
      localStorage.setItem('nixa-user-name', name.trim())
      localStorage.setItem('nixa-user-avatar', avatar.trim())
      window.dispatchEvent(new Event('nixa-profile-updated'))
      setMessage('Perfil salvo.')
    } catch {
      setError('Falha ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  async function handleResetAll() {
    const confirmed = window.confirm('Tem certeza? Isso vai limpar conversas, onboarding, cache local, indexação e chaves salvas.')
    if (!confirmed) return
    setResetting(true); setMessage(null); setError(null)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultProvider: 'gemini', apiKeys: { gemini: '', openai: '' } }),
      })
      localStorage.clear(); sessionStorage.clear()
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys()
        await Promise.all(keys.map(key => caches.delete(key)))
      }
      window.location.href = '/onboarding'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao resetar tudo')
    } finally {
      setResetting(false)
    }
  }

  const inputStyle = {
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
  } as const

  return (
    <div>
      <SectionHeader eyebrow="Você" title="Perfil." subtitle="Gerencie seu nome, foto e ações da conta local." />

      <div
        className="rounded-[16px] p-5 mb-4 space-y-4"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div>
          <label
            className="block text-[10.5px] tracking-[0.15em] uppercase font-mono mb-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Nome
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Como você quer ser chamado"
            className="w-full rounded-[10px] px-3 py-2.5 text-[14px] outline-none transition-colors"
            style={inputStyle}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
          />
        </div>
        <div>
          <label
            className="block text-[10.5px] tracking-[0.15em] uppercase font-mono mb-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            URL da foto (opcional)
          </label>
          <input
            value={avatar}
            onChange={e => setAvatar(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-[10px] px-3 py-2.5 text-[14px] outline-none transition-colors"
            style={inputStyle}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
          />
        </div>
      </div>

      <div
        className="rounded-[16px] p-5 mb-4"
        style={{
          background: 'var(--color-danger-soft)',
          border: '1px solid var(--color-danger)',
        }}
      >
        <p
          className="text-[10.5px] tracking-[0.15em] uppercase font-mono mb-2 flex items-center gap-1.5"
          style={{ color: 'var(--color-danger)' }}
        >
          <AlertTriangle className="w-3 h-3" strokeWidth={2.25} />
          Zona de risco
        </p>
        <p className="text-[12.5px] mb-4 leading-relaxed" style={{ color: 'var(--color-danger-deep)' }}>
          Resetar tudo remove conversas, onboarding, cache local, indexação e chaves salvas. Essa ação não pode ser desfeita.
        </p>
        <button
          onClick={handleResetAll}
          disabled={resetting}
          className="rounded-full px-4 py-2 text-[12.5px] font-medium transition-all disabled:opacity-60 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'var(--color-danger)',
            color: '#FFFFFF',
            border: '1px solid var(--color-danger)',
          }}
        >
          {resetting ? 'resetando…' : 'Resetar tudo'}
        </button>
      </div>

      {error && <p className="mb-3 text-[12.5px]" style={{ color: 'var(--color-accent)' }}>{error}</p>}
      {message && <p className="mb-3 text-[12.5px]" style={{ color: 'var(--color-accent)' }}>{message}</p>}

      <div className="flex justify-end">
        <button
          onClick={saveProfile}
          disabled={saving || resetting}
          className="rounded-full px-5 py-2 text-[13px] font-medium text-white transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'var(--color-accent)' }}
        >
          {saving ? 'salvando…' : 'Salvar perfil'}
        </button>
      </div>
    </div>
  )
}

// ─── About Tab ────────────────────────────────────────────────────────────────

function AboutTab() {
  const cardStyle = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
  } as const

  const tagStyle = {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-soft)',
  } as const

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Bastidores" title="Sobre o projeto." subtitle="Arquitetura e stack da Nixa AI." />

      {/* Architecture */}
      <div className="rounded-[16px] p-6" style={cardStyle}>
        <p
          className="text-[10.5px] tracking-[0.18em] uppercase font-mono mb-4"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Arquitetura
        </p>
        <div className="space-y-3">
          {[
            { folder: 'core/', desc: 'Núcleo da aplicação — LLM adapters, embeddings, RAG pipeline, vectorstore, crawler, settings encryption. Zero dependência de UI.' },
            { folder: 'features/', desc: 'Features de UI com padrão smart/dumb. Containers gerenciam estado e chamadas de API; components são presentacionais.' },
            { folder: 'shared/', desc: 'Componentes, hooks, contextos, tipos e utilitários reutilizáveis entre features.' },
            { folder: 'app/', desc: 'Next.js App Router — páginas, layouts e API routes.' },
          ].map(({ folder, desc }) => (
            <div key={folder} className="flex gap-3">
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-mono shrink-0 h-fit mt-0.5"
                style={tagStyle}
              >
                {folder}
              </span>
              <p className="text-[13px] leading-relaxed flex-1" style={{ color: 'var(--color-text-soft)' }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Stack */}
      <div className="rounded-[16px] p-6" style={cardStyle}>
        <p
          className="text-[10.5px] tracking-[0.18em] uppercase font-mono mb-4"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Stack
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
          {[
            ['Frontend',    'Next.js 14 · TypeScript · Tailwind'],
            ['Tipografia',  'Inter · Bricolage Grotesque · JetBrains Mono'],
            ['LLM',         'Gemini · OpenAI · Ollama'],
            ['Embeddings',  'Gemini · OpenAI · Ollama'],
            ['RAG',         'Crawler + chunk + busca híbrida + expansão PT→EN'],
            ['Vector store','JSON local com cosine + léxico'],
            ['Segurança',   'AES-256-GCM'],
            ['Seeds',       '90+ URLs NICE/CXone'],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5">
              <span
                className="text-[10px] tracking-[0.15em] uppercase font-mono"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {k}
              </span>
              <span style={{ color: 'var(--color-text)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Flow */}
      <div className="rounded-[16px] p-6" style={cardStyle}>
        <p
          className="text-[10.5px] tracking-[0.18em] uppercase font-mono mb-4"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Fluxo RAG
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
          {['docs', 'crawler', 'chunks', 'embeddings', 'vectorstore'].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md px-2.5 py-1 font-mono" style={tagStyle}>
                {step}
              </span>
              {i < arr.length - 1 && (
                <span style={{ color: 'var(--color-text-muted)' }}>→</span>
              )}
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px]">
          {['pergunta', 'retrieval', 'contexto', 'LLM', 'resposta'].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span
                className="inline-flex items-center rounded-md px-2.5 py-1 font-mono"
                style={{
                  ...tagStyle,
                  background: i === 1 || i === arr.length - 1 ? 'var(--color-accent-soft)' : 'var(--color-surface-2)',
                  color: i === 1 || i === arr.length - 1 ? 'var(--color-accent-deep)' : 'var(--color-text-soft)',
                }}
              >
                {step}
              </span>
              {i < arr.length - 1 && (
                <span style={{ color: 'var(--color-text-muted)' }}>→</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Env */}
      <div className="rounded-[16px] p-6" style={cardStyle}>
        <p
          className="text-[10.5px] tracking-[0.18em] uppercase font-mono mb-4"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Variáveis de ambiente
        </p>
        <div className="space-y-2.5 text-[13px]">
          {[
            ['LLM_SETTINGS_MASTER_KEY', 'Obrigatório — chave de criptografia AES-256'],
            ['GEMINI_API_KEY',          'Chave do Google AI Studio'],
            ['OLLAMA_BASE_URL',         'Default http://localhost:11434'],
            ['OLLAMA_MODEL',            'Default llama3.2:1b'],
            ['OLLAMA_EMBEDDING_MODEL',  'Default all-minilm'],
          ].map(([key, desc]) => (
            <div key={key} className="flex flex-wrap gap-2 items-baseline">
              <code
                className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-mono"
                style={tagStyle}
              >
                {key}
              </code>
              <span style={{ color: 'var(--color-text-soft)' }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Credits */}
      <div
        className="rounded-[16px] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        style={cardStyle}
      >
        <div>
          <p
            className="text-[10.5px] tracking-[0.18em] uppercase font-mono mb-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Desenvolvido por
          </p>
          <p
            className="font-display font-semibold text-[18px] tracking-tight"
            style={{ color: 'var(--color-text)' }}
          >
            Yasmin Lopes
          </p>
        </div>
        <a
          href="https://yasminlopes.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors hover:opacity-90 w-fit"
          style={{
            background: 'var(--color-surface-2)',
            color: 'var(--color-accent)',
            border: '1px solid var(--color-border)',
          }}
        >
          yasminlopes.dev
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 17 L17 7" />
            <path d="M8 7 L17 7 L17 16" />
          </svg>
        </a>
      </div>
    </div>
  )
}
