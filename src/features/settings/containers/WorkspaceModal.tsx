'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  BookOpen,
  Settings,
  User,
  KeyRound,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  Database,
} from 'lucide-react'
import { type Provider } from '@/core/providers'
import { ProviderIcon } from '@/shared/components/ProviderIcon'
import { ThemeToggle } from '@/shared/components/ThemeToggle'

export type WorkspaceTab = 'profile' | 'index' | 'settings' | 'about' | 'gemini-key'

type SettingsPayload = {
  defaultProvider: Provider
  hasKeys: Record<Provider, boolean>
  updatedAt: string | null
  message?: string
}

const PROVIDERS: Array<{ id: Provider; label: string; placeholder: string }> = [
  { id: 'gemini', label: 'Google Gemini', placeholder: 'AIza...' },
  { id: 'openai', label: 'OpenAI (GPT)', placeholder: 'sk-...' },
]

const TABS: Array<{ id: WorkspaceTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'index', label: 'Indexar documentação', icon: BookOpen },
  { id: 'settings', label: 'LLM / Chaves', icon: Settings },
  { id: 'about', label: 'Sobre o projeto', icon: ShieldCheck },
  { id: 'gemini-key', label: 'Gerar chave Gemini', icon: KeyRound },
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

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  function handleRequestClose() {
    if (isIndexing) {
      setShowCloseConfirm(true)
      return
    }

    onClose()
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
      <div className="w-full max-w-6xl h-[90vh] overflow-hidden rounded-2xl border border-[#d4e0f3] bg-[#fdfefe] shadow-2xl">
        <div className="h-full grid grid-cols-1 md:grid-cols-[240px_1fr]">
          <aside className="border-b md:border-b-0 md:border-r border-[#d4e0f3] bg-[#f8fcff] p-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-sm font-semibold text-[#17223d]">Configurações</p>
              <button
                onClick={handleRequestClose}
                className="w-8 h-8 rounded-md text-[#425f83] hover:bg-[#d4e0f3] transition-colors flex items-center justify-center"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="space-y-1">
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
                    className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-[#4f7a96] text-white'
                        : locked
                        ? 'text-[#b8c9dd] cursor-not-allowed opacity-50'
                        : 'text-[#2f4a6b] hover:bg-[#e9f2fb]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                )
              })}
            </nav>

            <div className="mt-3 pt-3 border-t border-[#d4e0f3] px-1 flex items-center justify-between">
              <span className="text-xs text-[#5d7594]">Tema</span>
              <ThemeToggle />
            </div>
          </aside>

          <section className="h-full overflow-y-auto p-6">
            {tab === 'profile' && <ProfileTab />}
            {tab === 'index' && <IndexTab onRunningChange={setIsIndexing} />}
            {tab === 'settings' && <SettingsTab />}
            {tab === 'about' && <AboutTab />}
            {tab === 'gemini-key' && <GeminiKeyTab />}
          </section>
        </div>
      </div>

      {showCloseConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#d4e0f3] bg-white shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#d4e0f3] bg-[#f8fcff]">
              <h3 className="text-base font-semibold text-[#17223d]">Interromper indexação?</h3>
            </div>
            <div className="px-5 py-4 text-sm text-[#425f83] leading-relaxed">
              A indexação está em andamento. Se fechar agora, o processo será interrompido.
            </div>
            <div className="px-5 py-4 border-t border-[#d4e0f3] bg-white flex justify-end gap-2">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="rounded-lg border border-[#94a6b8] text-[#425f83] px-4 py-2 text-sm"
              >
                Continuar indexando
              </button>
              <button
                onClick={() => {
                  setShowCloseConfirm(false)
                  onClose()
                }}
                className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm"
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

function IndexTab({ onRunningChange }: { onRunningChange: (running: boolean) => void }) {
  const [logs, setLogs] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [chunkCount, setChunkCount] = useState(0)
  const [forceReindex, setForceReindex] = useState(false)
  const [reloadCountdown, setReloadCountdown] = useState<number | null>(null)
  const [hasWarnings, setHasWarnings] = useState(false)
  const logsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    onRunningChange(running)
  }, [running, onRunningChange])

  // Warn if user tries to close/reload the page while indexing
  useEffect(() => {
    if (!running) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [running])

  // Auto-reload countdown after indexing done
  useEffect(() => {
    if (!done) return
    setReloadCountdown(5)
    const interval = setInterval(() => {
      setReloadCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          window.location.reload()
          return null
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [done])

  async function startIndexing() {
    setRunning(true)
    setLogs([])
    setDone(false)
    setChunkCount(0)
    setHasWarnings(false)

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

        const text = decoder.decode(value)
        const lines = text.split('\n').filter(l => l.startsWith('data:'))

        for (const line of lines) {
          try {
            const { msg } = JSON.parse(line.slice(5))
            setLogs(prev => [...prev, msg])
            
            // Detecta avisos de taxa limite
            if (msg.includes('⚠️') || msg.includes('rate limit') || msg.includes('indisponível')) {
              setHasWarnings(true)
            }
            
            // Tenta extrair o número de chunks ADICIONADOS desta sessão
            const addedMatch = msg.match(/(\d+)\s+chunks\s+adicionados/i)
            if (addedMatch) {
              setChunkCount(parseInt(addedMatch[1]))
            }
            
            setTimeout(() => {
              logsRef.current?.scrollTo({ top: 99999, behavior: 'smooth' })
            }, 50)
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      setLogs(prev => [...prev, `Erro: ${err instanceof Error ? err.message : String(err)}`])
    } finally {
      setRunning(false)
      setDone(true)
      
      // Obtém stats finais se não encontrou no log
      if (chunkCount === 0) {
        try {
          const statsRes = await fetch('/api/index-docs')
          const stats = await statsRes.json()
          if (stats.count) {
            setChunkCount(stats.count)
          }
        } catch {
          // ignore
        }
      }
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#17223d]">Indexar documentação</h2>
      <p className="text-sm text-[#425f83] mt-1 mb-5">Atualize a base de contexto da Nixa com docs NICE/CXone.</p>

      {logs.length === 0 && !running ? (
        <div className="rounded-xl border border-[#d4e0f3] bg-white p-5">
          <div className="w-12 h-12 bg-[#d4e0f3] rounded-xl flex items-center justify-center mb-3">
            <BookOpen className="w-6 h-6 text-[#4f7a96]" />
          </div>
          <p className="text-sm text-[#425f83] mb-2">Vai crawlear e indexar as docs públicas:</p>
          <ul className="text-sm text-[#17223d] space-y-1 mb-4">
            <li>• help.nicecxone.com</li>
            <li>• developer.niceincontact.com</li>
          </ul>
          <div className="bg-[#e9f7fc] border border-[#9ac5ef] rounded-lg p-3 flex gap-2 text-left">
            <AlertTriangle className="w-4 h-4 text-[#4f7a96] shrink-0 mt-0.5" />
            <p className="text-xs text-[#425f83]">
              Pode levar alguns minutos e consumir requests do provedor de embeddings. URLs já indexadas recentemente são puladas automaticamente.
            </p>
          </div>
          <label className="mt-4 flex items-center gap-3 cursor-pointer select-none w-fit">
            <button
              type="button"
              role="switch"
              aria-checked={forceReindex}
              onClick={() => setForceReindex(v => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${forceReindex ? 'bg-[#4f7a96]' : 'bg-[#d4e0f3]'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${forceReindex ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-xs text-[#425f83]">
              Forçar re-indexação completa <span className="text-[#4f7a96]">(ignora cache)</span>
            </span>
          </label>
        </div>
      ) : (
        <>
          <div
            ref={logsRef}
            className="bg-gray-950 rounded-xl p-4 h-[360px] overflow-y-auto scrollbar-thin font-mono text-xs"
          >
            {logs.map((log, i) => (
              <p
                key={i}
                className={
                  log.startsWith('✅')
                    ? 'text-emerald-400'
                    : log.startsWith('❌')
                    ? 'text-red-400'
                    : log.startsWith('✓')
                    ? 'text-green-400'
                    : log.includes('⚠️')
                    ? 'text-yellow-400 font-semibold'
                    : 'text-gray-300'
                }
              >
                {log}
              </p>
            ))}
            {running && <p className="text-[#4cacc7] animate-pulse">▋ processando...</p>}
          </div>
          
          {hasWarnings && running && (
            <div className="mt-3 flex items-start gap-3 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-900">Taxa de requisição atingida</p>
                <p className="text-xs text-yellow-700 mt-1">
                  O provedor de embeddings está limitando requisições. Aguarde o retry automático...
                </p>
                <p className="text-xs text-yellow-600 mt-2">
                  💡 Dica: Verifique sua quota de API em{' '}
                  <a href="https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-yellow-800">
                    Google AI Studio
                  </a>
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* "Don't close tab" banner — visible while running */}
      {running && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            Não feche nem troque de aba — a indexação será interrompida.
          </p>
        </div>
      )}

      {done && (
        <div className="mt-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-cyan-50 border-2 border-emerald-200 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 animate-bounce">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-emerald-900">Tudo pronto!</h3>
              <p className="text-sm text-emerald-700 mt-1">
                Base de conhecimento da Nixa atualizada com sucesso.
              </p>
              {chunkCount > 0 && (
                <div className="mt-3 flex items-center gap-2 bg-white rounded-lg px-3 py-2 w-fit border border-emerald-200">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-[#17223d]">
                    {chunkCount.toLocaleString('pt-BR')} chunks indexados
                  </span>
                </div>
              )}
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium transition-colors"
                >
                  Recarregar e usar
                </button>
                {reloadCountdown !== null && (
                  <span className="text-xs text-emerald-600">
                    Recarregando em {reloadCountdown}s...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          onClick={startIndexing}
          disabled={running}
          className="px-4 py-2 text-sm bg-[#4f7a96] text-white rounded-lg hover:bg-[#425f83] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {running ? 'Indexando...' : 'Iniciar indexação'}
        </button>
      </div>

    </div>
  )
}

function SettingsTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const [defaultProvider, setDefaultProvider] = useState<Provider>('gemini')
  const [hasKeys, setHasKeys] = useState<Record<Provider, boolean>>({
    gemini: false, openai: false,
  })
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
    setSuccess(null)
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      // Only send the key that was actually typed — empty = keep existing
      const apiKeys = keyValue.trim()
        ? { [defaultProvider]: keyValue.trim() }
        : {}
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
      setSuccess('Salvo.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const current = PROVIDERS.find(p => p.id === defaultProvider)!

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#17223d]">LLM / Chaves de API</h2>
        <p className="text-sm text-[#425f83] mt-0.5">Selecione um provedor para defini-lo como padrão e configurar sua chave.</p>
      </div>

      {/* Provider chips — click = set default + show its input */}
      <div className="flex flex-wrap gap-2">
        {PROVIDERS.map(p => (
          <button
            key={p.id}
            onClick={() => selectProvider(p.id)}
            className={`relative flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              defaultProvider === p.id
                ? 'border-[#4f7a96] bg-[#4f7a96] text-white'
                : 'border-[#c8d5e8] text-[#2f4a6b] hover:bg-[#edf5fb]'
            }`}
          >
            <ProviderIcon provider={p.id} />
            {p.label}
            {hasKeys[p.id] && (
              <span className={`w-1.5 h-1.5 rounded-full ${defaultProvider === p.id ? 'bg-white/70' : 'bg-emerald-400'}`} />
            )}
          </button>
        ))}
      </div>

      {/* Single input for active provider */}
      <div className="rounded-xl border border-[#d4e0f3] bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ProviderIcon provider={defaultProvider} />
            <span className="text-sm font-medium text-[#17223d]">{current.label}</span>
          </div>
          <span className={`text-[11px] rounded-full px-2 py-0.5 border font-medium ${
            hasKeys[defaultProvider]
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {hasKeys[defaultProvider] ? 'chave salva' : 'sem chave'}
          </span>
        </div>
        <input
          type="password"
          value={keyValue}
          onChange={e => setKeyValue(e.target.value)}
          placeholder={hasKeys[defaultProvider] ? '••••••••• (deixe vazio para manter)' : current.placeholder}
          className="w-full rounded-lg border border-[#d4e0f3] bg-[#f8fcff] px-3 py-2 text-sm outline-none focus:border-[#4f7a96] focus:ring-1 focus:ring-[#9ac5ef]"
        />
      </div>

      {/* Security note */}
      <div className="flex items-start gap-2 rounded-lg bg-[#f0f9ff] border border-[#9ac5ef] px-3 py-2.5 text-xs text-[#425f83]">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#4cacc7]" />
        <span>
          Chaves criptografadas com <span className="font-medium text-[#2f4a6b]">AES-256-GCM</span> no servidor.
          Defina <code className="font-mono bg-white/70 px-1 rounded text-[#17223d]">LLM_SETTINGS_MASTER_KEY</code> no .env.local.
          {updatedAt && <span className="text-[#5d7594]"> · Salvo em {new Date(updatedAt).toLocaleString('pt-BR')}</span>}
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-700">{success}</p>}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading || saving}
          className="rounded-lg bg-[#4f7a96] hover:bg-[#425f83] text-white px-4 py-2 text-sm font-medium disabled:opacity-60 transition-colors"
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

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
    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      localStorage.setItem('nixa-user-name', name.trim())
      localStorage.setItem('nixa-user-avatar', avatar.trim())
      window.dispatchEvent(new Event('nixa-profile-updated'))
      setMessage('Perfil salvo com sucesso.')
    } catch {
      setError('Falha ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  async function handleResetAll() {
    const confirmed = window.confirm(
      'Tem certeza que deseja resetar tudo? Isso vai limpar conversas, onboarding, cache local, indexação e chaves salvas.'
    )
    if (!confirmed) return

    setResetting(true)
    setMessage(null)
    setError(null)

    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultProvider: 'gemini',
          apiKeys: { gemini: '', openai: '', anthropic: '', groq: '', huggingface: '' },
        }),
      })

      // Limpa apenas conversas locais, mantém documentação indexada
      localStorage.clear()
      sessionStorage.clear()

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

  return (
    <div>
      <h2 className="text-xl font-semibold text-[#17223d]">Perfil</h2>
      <p className="text-sm text-[#425f83] mt-1 mb-5">Gerencie seu nome, foto e ações da conta local.</p>

      <div className="rounded-xl border border-[#d4e0f3] bg-white p-4 mb-4">
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[#5d7594] mb-1">Nome</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Seu nome"
              className="w-full rounded-lg border border-[#94a6b8] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#9ac5ef]"
            />
          </div>
          <div>
            <label className="block text-xs text-[#5d7594] mb-1">URL da foto (opcional)</label>
            <input
              value={avatar}
              onChange={e => setAvatar(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-[#94a6b8] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#9ac5ef]"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-4">
        <p className="text-sm font-medium text-red-800 mb-1">Zona de risco</p>
        <p className="text-xs text-red-700 mb-3">Resetar tudo remove conversas, onboarding, cache local, indexação e chaves salvas.</p>
        <button
          onClick={handleResetAll}
          disabled={resetting}
          className="rounded-lg border border-red-300 bg-white text-red-700 hover:bg-red-100 px-4 py-2 text-sm disabled:opacity-60"
        >
          {resetting ? 'Resetando...' : 'Resetar tudo'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {message && <p className="text-sm text-emerald-700 mb-3">{message}</p>}

      <div className="flex justify-end">
        <button
          onClick={saveProfile}
          disabled={saving || resetting}
          className="rounded-lg bg-[#4f7a96] hover:bg-[#425f83] text-white px-4 py-2 text-sm disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Salvar perfil'}
        </button>
      </div>
    </div>
  )
}

function AboutTab() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[#17223d]">Sobre o projeto</h2>
      <p className="text-sm text-[#425f83] mt-1 mb-5">Arquitetura e fluxo da Nixa AI.</p>

      <div className="overflow-x-auto rounded-xl border border-[#d4e0f3] mb-6">
        <table className="w-full text-sm">
          <thead className="bg-[#d4e0f3] text-[#17223d]">
            <tr>
              <th className="px-4 py-3 text-left">Camada</th>
              <th className="px-4 py-3 text-left">Ferramenta</th>
              <th className="px-4 py-3 text-left">Por que</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[#d4e0f3]"><td className="px-4 py-3">Frontend</td><td className="px-4 py-3">Next.js 14 + Tailwind</td><td className="px-4 py-3">Interface de chat rápida e responsiva</td></tr>
            <tr className="border-t border-[#d4e0f3]"><td className="px-4 py-3">Chat LLM</td><td className="px-4 py-3">Gemini, OpenAI, Anthropic, Groq e Hugging Face</td><td className="px-4 py-3">Troca dinâmica do provedor</td></tr>
            <tr className="border-t border-[#d4e0f3]"><td className="px-4 py-3">RAG</td><td className="px-4 py-3">Crawler + chunk + ranking</td><td className="px-4 py-3">Respostas com contexto de docs NICE/CXone</td></tr>
            <tr className="border-t border-[#d4e0f3]"><td className="px-4 py-3">Vector Store</td><td className="px-4 py-3">Persistência local JSON</td><td className="px-4 py-3">Simplicidade para desenvolvimento</td></tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-[#d4e0f3] bg-white p-4 mb-6">
        <h3 className="text-base font-semibold mb-2">Fluxo da Nixa</h3>
        <pre className="text-sm leading-6 text-[#17223d] overflow-x-auto">{`Docs NICE/CXone -> crawler -> chunks -> index local
                                 |
Usuário -> pergunta -> retrieval -> contexto -> LLM selecionada -> resposta`}</pre>
      </div>

      <div className="rounded-xl border border-[#d4e0f3] bg-white p-4">
        <h3 className="text-base font-semibold mb-2">Segurança de chaves</h3>
        <p className="text-sm text-[#425f83] mb-2">
          As API keys são salvas com criptografia no servidor e nunca retornam em texto plano para o cliente.
        </p>
        <p className="text-sm text-[#17223d]">
          Variável obrigatória: <span className="font-semibold">LLM_SETTINGS_MASTER_KEY</span> no arquivo .env.local.
        </p>
      </div>
    </div>
  )
}

function GeminiKeyTab() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[#17223d]">Gerar chave Gemini</h2>
      <p className="text-sm text-[#425f83] mt-1 mb-5">Abra o Google AI Studio para gerar uma API key nova.</p>

      <div className="rounded-xl border border-[#d4e0f3] bg-white p-5">
        <ol className="list-decimal pl-5 text-sm text-[#17223d] space-y-2">
          <li>Acesse o Google AI Studio.</li>
          <li>Clique em criar nova API key.</li>
          <li>Copie a chave e volte para a aba LLM / Chaves.</li>
          <li>Cole no campo Gemini e salve.</li>
        </ol>

        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#4f7a96] hover:bg-[#425f83] text-white px-4 py-2 text-sm transition-colors"
        >
          Abrir Google AI Studio
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}
