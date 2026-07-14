'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Database, CheckCircle2, XCircle } from 'lucide-react'
import { Callout } from '@/shared/ui/callout'
import { getApiKeyMap } from '@/shared/utils/api-key-storage'
import { SectionHeader } from '../section-header'
import styles from './index-tab.module.scss'

type Status = 'idle' | 'indexing' | 'success' | 'error'

// Sem progresso do servidor por este tempo → aborta e cai em erro (evita loader
// infinito quando o stream trava sem fechar a conexão). Cada chunk recebido
// reinicia o cronômetro, então backoffs de rate limit (que emitem avisos) não
// disparam o timeout.
const IDLE_TIMEOUT_MS = 120_000

const AUTO_CLOSE_SECONDS = 6

interface IndexTabProps {
  onRunningChange: (running: boolean) => void
  onClose: () => void
}

export function IndexTab({ onRunningChange, onClose }: IndexTabProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [logs, setLogs] = useState<string[]>([])
  const [chunkCount, setChunkCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [forceReindex, setForceReindex] = useState(false)
  const [autoCloseIn, setAutoCloseIn] = useState<number | null>(null)
  const logsRef = useRef<HTMLDivElement>(null)

  const running = status === 'indexing'
  const hasWarnings =
    running &&
    logs.some(log => log.includes('⚠️') || log.includes('rate limit') || log.includes('indisponível'))

  useEffect(() => { onRunningChange(running) }, [running, onRunningChange])

  useEffect(() => {
    if (!running) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [running])

  useEffect(() => {
    if (status !== 'success') { setAutoCloseIn(null); return }
    setAutoCloseIn(AUTO_CLOSE_SECONDS)
    const interval = setInterval(() => {
      setAutoCloseIn(prev => {
        if (prev === null || prev <= 1) { clearInterval(interval); onClose(); return null }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [status, onClose])

  async function startIndexing() {
    setStatus('indexing')
    setLogs([])
    setChunkCount(0)
    setErrorMessage(null)

    const controller = new AbortController()
    let idleTimer: ReturnType<typeof setTimeout> | undefined
    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(
        () => controller.abort(new DOMException('Idle timeout', 'TimeoutError')),
        IDLE_TIMEOUT_MS
      )
    }

    let sawComplete = false
    let sawFatal = false

    try {
      resetIdleTimer()

      const res = await fetch('/api/index-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxPages: 60, maxDepth: 2, staleDays: 14, force: forceReindex, apiKeys: getApiKeyMap() }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.message ?? `A API respondeu com erro (HTTP ${res.status}).`)
      }
      if (!res.body) throw new Error('Resposta inválida do servidor (corpo vazio).')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        resetIdleTimer()

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? '' // guarda a última linha (possivelmente parcial)

        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          try {
            const parsed = JSON.parse(line.slice(5))
            const msg = parsed?.msg
            if (typeof msg !== 'string') continue

            setLogs(prev => [...prev, msg])
            if (msg.startsWith('✅')) sawComplete = true
            if (msg.startsWith('❌')) sawFatal = true

            setTimeout(() => logsRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 50)
          } catch {
          }
        }
      }

      if (sawFatal) {
        throw new Error('A indexação falhou no servidor. Confira os logs abaixo e tente novamente.')
      }
      if (!sawComplete) {
        throw new Error('A conexão foi encerrada antes de concluir. Tente novamente.')
      }

      try {
        const stats = await fetch('/api/index-docs').then(response => (response.ok ? response.json() : null))
        if (stats?.count) setChunkCount(stats.count)
      } catch {
      }

      setStatus('success')
    } catch (error) {
      const isAbort =
        error instanceof DOMException && (error.name === 'AbortError' || error.name === 'TimeoutError')
      setErrorMessage(
        isAbort
          ? 'Tempo limite excedido — a indexação ficou sem responder. Tente novamente.'
          : error instanceof Error ? error.message : 'Erro inesperado durante a indexação.'
      )
      setStatus('error')
    } finally {
      // Garante que nenhum timer fique pendurado. NUNCA define sucesso aqui —
      // o estado final já foi decidido no try (success) ou no catch (error).
      if (idleTimer) clearTimeout(idleTimer)
    }
  }

  function logClass(log: string) {
    if (log.startsWith('✅')) return styles.logSuccess
    if (log.startsWith('❌')) return styles.logError
    if (log.startsWith('✓')) return styles.logOk
    if (log.includes('⚠️')) return styles.logWarning
    return styles.logDefault
  }

  const submitLabel =
    status === 'indexing' ? 'Indexando…' : status === 'error' ? 'Tentar novamente' : 'Iniciar indexação'

  return (
    <div>
      <SectionHeader
        eyebrow="Base de conhecimento"
        title="Indexar documentação."
        subtitle="Atualize a base de contexto da Nixa com as docs NICE/CXone."
      />

      {status === 'idle' && logs.length === 0 ? (
        <div className={styles.card}>
          <p className={styles.cardText}>Vai crawlear e indexar as docs públicas:</p>
          <ul className={styles.seedList}>
            <li>· help.nicecxone.com</li>
            <li>· developer.niceincontact.com</li>
          </ul>

          <Callout icon={AlertTriangle} tone="neutral">
            Pode levar alguns minutos e consumir requests do provedor de embeddings. URLs já indexadas recentemente são puladas automaticamente.
          </Callout>

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
          <div ref={logsRef} className={styles.terminal} aria-live="polite">
            {logs.map((log, i) => (
              <p key={i} className={logClass(log)}>{log}</p>
            ))}
            {running && (
              <p className={styles.processing}>▋ processando...</p>
            )}
          </div>

          {hasWarnings && (
            <Callout icon={AlertTriangle} tone="accent" title="Taxa de requisição atingida" className={styles.spacedTop}>
              O provedor de embeddings está limitando requisições. Retry automático em andamento.
            </Callout>
          )}
        </>
      )}

      {running && (
        <Callout icon={AlertTriangle} tone="accent" className={styles.spacedTop}>
          Não feche nem troque de aba — a indexação será interrompida.
        </Callout>
      )}

      {status === 'success' && (
        <div className={styles.doneCard} role="status">
          <div className={styles.stateEyebrowRow}>
            <CheckCircle2 className={styles.doneStateIcon} />
            <p className={styles.doneEyebrow}>Concluído</p>
          </div>
          <h3 className={styles.doneTitle}>Documentação indexada.</h3>
          <p className={styles.doneText}>A base de conhecimento foi atualizada com sucesso.</p>
          {chunkCount > 0 && (
            <div className={styles.chunkBadge}>
              <Database className={styles.chunkBadgeIcon} />
              <span className={styles.chunkBadgeText}>
                {chunkCount.toLocaleString('pt-BR')} chunks na base
              </span>
            </div>
          )}
          <div className={styles.doneActions}>
            <button onClick={onClose} className={styles.reloadButton}>
              Fechar agora
            </button>
            {autoCloseIn !== null && (
              <span className={styles.reloadCountdown}>
                fechando em {autoCloseIn}s…
              </span>
            )}
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className={styles.errorCard} role="alert">
          <div className={styles.stateEyebrowRow}>
            <XCircle className={styles.errorStateIcon} />
            <p className={styles.errorEyebrow}>Falhou</p>
          </div>
          <h3 className={styles.errorTitle}>A indexação não foi concluída.</h3>
          <p className={styles.errorText}>Nada foi corrompido — você pode tentar novamente.</p>
          {errorMessage && (
            <p className={styles.errorReason}>{errorMessage}</p>
          )}
          <div className={styles.doneActions}>
            <button onClick={startIndexing} className={styles.retryButton}>
              Tentar novamente
            </button>
            <button onClick={onClose} className={styles.secondaryButton}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {status !== 'success' && (
        <div className={styles.submitRow}>
          <button onClick={startIndexing} disabled={running} className={styles.submitButton}>
            {submitLabel}
          </button>
        </div>
      )}
    </div>
  )
}
