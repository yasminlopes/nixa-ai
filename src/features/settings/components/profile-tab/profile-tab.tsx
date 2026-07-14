'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { updateSettings } from '@/shared/services/settings-service'
import { SectionHeader } from '../section-header'
import styles from './profile-tab.module.scss'

export function ProfileTab() {
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
      await updateSettings({ defaultProvider: 'gemini', apiKeys: { gemini: '', openai: '' } }).catch(() => { /* segue o reset local mesmo se o servidor não responder */ })
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

  return (
    <div>
      <SectionHeader eyebrow="Você" title="Perfil." subtitle="Gerencie seu nome, foto e ações da conta local." />

      <div className={styles.card}>
        <div>
          <label className={styles.label}>Nome</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Como você quer ser chamado"
            className={styles.input}
          />
        </div>
        <div>
          <label className={styles.label}>URL da foto (opcional)</label>
          <input
            value={avatar}
            onChange={e => setAvatar(e.target.value)}
            placeholder="https://..."
            className={styles.input}
          />
        </div>
      </div>

      <div className={styles.dangerCard}>
        <p className={styles.dangerLabel}>
          <AlertTriangle size={12} strokeWidth={2.25} />
          Zona de risco
        </p>
        <p className={styles.dangerText}>
          Resetar tudo remove conversas, onboarding, cache local, indexação e chaves salvas. Essa ação não pode ser desfeita.
        </p>
        <button onClick={handleResetAll} disabled={resetting} className={styles.dangerButton}>
          {resetting ? 'resetando…' : 'Resetar tudo'}
        </button>
      </div>

      {error && <p className={styles.message}>{error}</p>}
      {message && <p className={styles.message}>{message}</p>}

      <div className={styles.submitRow}>
        <button onClick={saveProfile} disabled={saving || resetting} className={styles.submitButton}>
          {saving ? 'salvando…' : 'Salvar perfil'}
        </button>
      </div>
    </div>
  )
}
