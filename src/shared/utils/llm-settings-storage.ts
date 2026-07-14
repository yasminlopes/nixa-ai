import { type Provider } from '@/core/providers'

/**
 * Cache local só do provider padrão escolhido — puramente uma preferência de UI.
 * As API keys ficam em outro storage (cifrado): ver shared/utils/api-key-storage.
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
  } catch {}
}

export function clearStoredProvider(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}
