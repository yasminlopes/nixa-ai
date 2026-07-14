import { type Provider } from '@/core/providers'

/**
 * Provider e API keys ficam só no navegador do usuário (localStorage), nunca em disco no servidor.
 * Isso evita depender de persistência em serverless (Vercel tem filesystem read-only e "esquece"
 * estado entre invocações) e faz cada visitante guardar a própria chave, sem compartilhar/sobrescrever
 * configuração global de outros usuários.
 *
 * Atenção: localStorage não é armazenamento seguro — qualquer script no mesmo domínio consegue lê-lo.
 * O encode em base64 abaixo só evita que a chave apareça em texto puro num grep casual do storage;
 * não é criptografia.
 */

const STORAGE_KEY = 'nixa-llm-settings-v1'

export type StoredLLMSettings = {
  defaultProvider: Provider
  apiKeys: Partial<Record<Provider, string>>
  updatedAt: string | null
}

const DEFAULTS: StoredLLMSettings = {
  defaultProvider: 'gemini',
  apiKeys: {},
  updatedAt: null,
}

function encode(value: string): string {
  return typeof window === 'undefined' ? value : window.btoa(unescape(encodeURIComponent(value)))
}

function decode(value: string): string {
  return typeof window === 'undefined' ? value : decodeURIComponent(escape(window.atob(value)))
}

export function getStoredSettings(): StoredLLMSettings {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(decode(raw)) as StoredLLMSettings
    return { ...DEFAULTS, ...parsed, apiKeys: { ...parsed.apiKeys } }
  } catch {
    return DEFAULTS
  }
}

export function saveStoredSettings(partial: Partial<StoredLLMSettings>): StoredLLMSettings {
  const current = getStoredSettings()
  const updated: StoredLLMSettings = {
    defaultProvider: partial.defaultProvider ?? current.defaultProvider,
    apiKeys: { ...current.apiKeys, ...partial.apiKeys },
    updatedAt: new Date().toISOString(),
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, encode(JSON.stringify(updated)))
  }
  return updated
}

export function getApiKey(provider: Provider): string | undefined {
  return getStoredSettings().apiKeys[provider]?.trim() || undefined
}

export function hasKey(provider: Provider): boolean {
  if (provider === 'ollama') return true
  return Boolean(getApiKey(provider))
}

export function clearStoredSettings(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}
