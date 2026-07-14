import { type Provider } from '@/core/providers';
import { maskKey } from '@/core/settings/mask-key';

export type ApiKeyMap = Partial<Record<Provider, string>>;

/**
 * Chaves de API vivem SÓ no navegador, cifradas via react-secure-storage, e são
 * enviadas ao servidor no body de cada request (sobre HTTPS). O servidor nunca
 * as persiste — por isso funciona em serverless (Vercel) sem disco persistente.
 * Ollama é local e não usa chave.
 */

const CLOUD_PROVIDERS: Provider[] = ['gemini', 'openai'];
const STORAGE_KEY = (provider: Provider) => `nixa-api-key:${provider}`;
const UPDATED_AT_KEY = 'nixa-api-keys-updated-at';

type SecureStore = {
  getItem(key: string): unknown;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

let cachedStore: SecureStore | null = null;

/**
 * react-secure-storage lê `localStorage` já no import (instancia um singleton),
 * então só pode ser carregado no cliente — carregar via require preguiçoso evita
 * quebrar o prerender no servidor.
 */
function store(): SecureStore | null {
  if (typeof window === 'undefined') return null;
  if (!cachedStore) {
    cachedStore = (require('react-secure-storage') as { default: SecureStore }).default;
  }
  return cachedStore;
}

function touch(): void {
  try {
    window.localStorage.setItem(UPDATED_AT_KEY, new Date().toISOString());
  } catch {}
}

export function getApiKey(provider: Provider): string | null {
  const secure = store();
  if (!secure) return null;
  const value = secure.getItem(STORAGE_KEY(provider));
  return typeof value === 'string' && value.trim() ? value : null;
}

export function setApiKey(provider: Provider, key: string): void {
  const secure = store();
  if (!secure) return;
  const trimmed = key.trim();
  if (trimmed) secure.setItem(STORAGE_KEY(provider), trimmed);
  else secure.removeItem(STORAGE_KEY(provider));
  touch();
}

export function removeApiKey(provider: Provider): void {
  store()?.removeItem(STORAGE_KEY(provider));
  touch();
}

export function clearApiKeys(): void {
  const secure = store();
  if (!secure) return;
  for (const provider of CLOUD_PROVIDERS) secure.removeItem(STORAGE_KEY(provider));
  touch();
}

/** Mapa de chaves pra enviar ao servidor no body do request. */
export function getApiKeyMap(): ApiKeyMap {
  const map: ApiKeyMap = {};
  for (const provider of CLOUD_PROVIDERS) {
    const key = getApiKey(provider);
    if (key) map[provider] = key;
  }
  return map;
}

/** Ollama é local → sempre disponível. */
export function getKeyStatus(): Record<Provider, boolean> {
  return {
    gemini: !!getApiKey('gemini'),
    openai: !!getApiKey('openai'),
    ollama: true,
  };
}

export function getMaskedKey(provider: Provider): string | null {
  const key = getApiKey(provider);
  return key ? maskKey(key) : null;
}

export function getKeysUpdatedAt(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(UPDATED_AT_KEY);
  } catch {
    return null;
  }
}
