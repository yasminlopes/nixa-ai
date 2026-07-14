import { type Provider } from '@/core/providers'

/**
 * Cache local só do provider padrão escolhido — puramente uma preferência de
 * UI (evita um flash de "gemini" antes do fetch em /api/settings resolver).
 * API keys NUNCA ficam aqui: elas vivem só no servidor, criptografadas
 * (ver core/settings/settings-store.ts) — o cliente nunca as recebe de volta.
 */

const STORAGE_KEY = 'nixa-default-provider-v1'

export function getStoredProvider(): Provider | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return (raw as Provider) || null
  } catch {
    return null
  }
}

export function saveStoredProvider(provider: Provider): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, provider)
  } catch {
    // ignore (private mode / storage cheio)
  }
}

export function clearStoredProvider(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}
