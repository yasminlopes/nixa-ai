'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Database } from 'lucide-react'
import { SectionHeader } from './section-header'

export function IndexTab({ onRunningChange }: { onRunningChange: (running: boolean) => void }) {
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
