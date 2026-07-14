import { type Provider } from '@/core/providers'

export type PublicSettings = {
  defaultProvider: Provider
  hasKeys: Record<Provider, boolean>
  maskedKeys: Partial<Record<Provider, string>>
  updatedAt: string | null
}

const DEFAULT_SETTINGS: PublicSettings = {
  defaultProvider: 'gemini',
  hasKeys: { gemini: false, openai: false, ollama: true },
  maskedKeys: {},
  updatedAt: null,
}

export async function fetchSettings(): Promise<PublicSettings> {
  try {
    const res = await fetch('/api/settings')
    if (!res.ok) return DEFAULT_SETTINGS
    return (await res.json()) as PublicSettings
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function updateSettings(input: {
  defaultProvider?: Provider
  apiKeys?: Partial<Record<Provider, string>>
}): Promise<PublicSettings> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = (await res.json()) as PublicSettings & { message?: string }
  if (!res.ok) throw new Error(data.message ?? 'Falha ao salvar configurações')
  return data
}

/** Remove a chave salva de um provider (nunca deixa o campo "vazio" ser ambíguo com "manter"). */
export async function removeApiKey(provider: Provider): Promise<PublicSettings> {
  return updateSettings({ apiKeys: { [provider]: '' } })
}
