'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Database } from 'lucide-react'
import { SectionHeader } from '../section-header'
import styles from './index-tab.module.scss'

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

  function logClass(log: string) {
    if (log.startsWith('✅')) return styles.logSuccess
    if (log.startsWith('❌')) return styles.logError
    if (log.startsWith('✓')) return styles.logOk
    if (log.includes('⚠️')) return styles.logWarning
    return styles.logDefault
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Base de conhecimento"
        title="Indexar documentação."
        subtitle="Atualize a base de contexto da Nixa com as docs NICE/CXone."
      />

      {logs.length === 0 && !running ? (
        <div className={styles.card}>
          <p className={styles.cardText}>Vai crawlear e indexar as docs públicas:</p>
          <ul className={styles.seedList}>
            <li>· help.nicecxone.com</li>
            <li>· developer.niceincontact.com</li>
          </ul>

          <div className={styles.noticeBox}>
            <AlertTriangle className={styles.noticeIcon} />
            <p className={styles.noticeText}>
              Pode levar alguns minutos e consumir requests do provedor de embeddings. URLs já indexadas recentemente são puladas automaticamente.
            </p>
          </div>

          <label className={styles.forceRow}>
            <button
              type="button"
              role="switch"
              aria-checked={forceReindex}
              onClick={() => setForceReindex(v => !v)}
              className={styles.switch}
              style={{ background: forceReindex ? 'var(--color-accent)' : 'var(--color-border-strong)' }}
            >
              <span
                className={styles.switchThumb}
                style={{ transform: forceReindex ? 'translateX(18px)' : 'translateX(2px)' }}
              />
            </button>
            <span className={styles.forceLabel}>
              Forçar re-indexação completa <span className={styles.forceHint}>(ignora cache)</span>
            </span>
          </label>
        </div>
      ) : (
        <>
          <div ref={logsRef} className={styles.terminal}>
            {logs.map((log, i) => (
              <p key={i} className={logClass(log)}>{log}</p>
            ))}
            {running && (
              <p className={styles.processing}>▋ processando...</p>
            )}
          </div>

          {hasWarnings && running && (
            <div className={styles.rateLimitBox}>
              <AlertTriangle className={styles.noticeIcon} />
              <div>
                <p className={styles.rateLimitTitle}>Taxa de requisição atingida</p>
                <p className={styles.rateLimitText}>
                  O provedor de embeddings está limitando requisições. Retry automático em andamento.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {running && (
        <div className={styles.runningNotice}>
          <AlertTriangle className={styles.runningNoticeIcon} />
          <p className={styles.runningNoticeText}>
            Não feche nem troque de aba — a indexação será interrompida.
          </p>
        </div>
      )}

      {done && (
        <div className={styles.doneCard}>
          <p className={styles.doneEyebrow}>Concluído</p>
          <h3 className={styles.doneTitle}>Tudo pronto.</h3>
          <p className={styles.doneText}>Base de conhecimento atualizada com sucesso.</p>
          {chunkCount > 0 && (
            <div className={styles.chunkBadge}>
              <Database className={styles.chunkBadgeIcon} />
              <span className={styles.chunkBadgeText}>
                {chunkCount.toLocaleString('pt-BR')} chunks
              </span>
            </div>
          )}
          <div className={styles.doneActions}>
            <button onClick={() => window.location.reload()} className={styles.reloadButton}>
              Recarregar agora
            </button>
            {reloadCountdown !== null && (
              <span className={styles.reloadCountdown}>
                recarregando em {reloadCountdown}s…
              </span>
            )}
          </div>
        </div>
      )}

      <div className={styles.submitRow}>
        <button onClick={startIndexing} disabled={running} className={styles.submitButton}>
          {running ? 'Indexando…' : 'Iniciar indexação'}
        </button>
      </div>
    </div>
  )
}
