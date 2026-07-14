'use client'

import { useEffect, useState } from 'react'
import { SectionHeader } from '../section-header'
import styles from './profile-tab.module.scss'

export function ProfileTab() {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [saving, setSaving] = useState(false)
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

  return (
    <div>
      <SectionHeader eyebrow="Conta" title="Perfil." subtitle="Gerencie suas informações pessoais." />

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

      {error && <p className={styles.message}>{error}</p>}
      {message && <p className={styles.message}>{message}</p>}

      <div className={styles.submitRow}>
        <button onClick={saveProfile} disabled={saving} className={styles.submitButton}>
          {saving ? 'salvando…' : 'Salvar perfil'}
        </button>
      </div>
    </div>
  )
}
