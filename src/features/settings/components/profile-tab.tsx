'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { SectionHeader } from './section-header'

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
