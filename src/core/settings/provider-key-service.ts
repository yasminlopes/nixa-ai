import { type Provider } from '@/core/providers';

export type ApiKeyMap = Partial<Record<Provider, string>>;

export class MissingApiKeyError extends Error {
  provider: Provider;

  constructor(provider: Provider) {
    super(`Chave da LLM (${provider}) não configurada.`);
    this.name = 'MissingApiKeyError';
    this.provider = provider;
  }
}

/**
 * Resolve a chave de um provider a partir do mapa enviado pelo cliente (no body
 * do request, sobre HTTPS). O servidor NUNCA persiste chaves — elas vivem
 * cifradas no navegador (react-secure-storage) e chegam por requisição.
 * Ollama é local e não usa chave.
 */
export function getKeyForProvider(provider: Provider, apiKeys?: ApiKeyMap): string {
  if (provider === 'ollama') return '';

  const key = apiKeys?.[provider]?.trim();
  if (!key) throw new MissingApiKeyError(provider);
  return key;
}
