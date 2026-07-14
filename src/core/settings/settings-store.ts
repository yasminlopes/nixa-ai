import fs from 'fs/promises'
import path from 'path'
import { type Provider } from '@/core/providers'
import { encrypt, decrypt } from './crypto'
import { maskKey } from './mask-key'

type StoredSettings = {
  defaultProvider: Provider
  encryptedKeys: Partial<Record<Provider, string>>
  updatedAt: string | null
}

export type PublicSettings = {
  defaultProvider: Provider
  hasKeys: Record<Provider, boolean>
  maskedKeys: Partial<Record<Provider, string>>
  updatedAt: string | null
}

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'settings.enc.json')
const PROVIDERS: Provider[] = ['gemini', 'openai', 'ollama']

// Fallback em memória para filesystems read-only (algumas plataformas
// serverless). Não persiste entre cold starts — ver limitação no README.
let memoryStore: StoredSettings | null = null

async function readSettings(): Promise<StoredSettings> {
  if (memoryStore) return memoryStore
  try {
    const raw = await fs.readFile(SETTINGS_PATH, 'utf-8')
    memoryStore = JSON.parse(raw) as StoredSettings
  } catch {
    memoryStore = { defaultProvider: 'gemini', encryptedKeys: {}, updatedAt: null }
  }
  return memoryStore
}

async function writeSettings(settings: StoredSettings): Promise<void> {
  memoryStore = settings
  try {
    await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true })
    await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8')
  } catch {
    // Filesystem read-only — segue só com o cache em memória do processo.
  }
}

export async function getPublicSettings(): Promise<PublicSettings> {
  const stored = await readSettings()
  const hasKeys = {} as Record<Provider, boolean>
  const maskedKeys: Partial<Record<Provider, string>> = {}

  for (const provider of PROVIDERS) {
    if (provider === 'ollama') { hasKeys[provider] = true; continue }

    const encrypted = stored.encryptedKeys[provider]
    if (!encrypted) { hasKeys[provider] = false; continue }

    try {
      maskedKeys[provider] = maskKey(decrypt(encrypted))
      hasKeys[provider] = true
    } catch {
      hasKeys[provider] = false
    }
  }

  return {
    defaultProvider: stored.defaultProvider,
    hasKeys,
    maskedKeys,
    updatedAt: stored.updatedAt,
  }
}

export async function saveSettings(input: {
  defaultProvider?: Provider
  apiKeys?: Partial<Record<Provider, string>>
}): Promise<PublicSettings> {
  const current = await readSettings()
  const encryptedKeys = { ...current.encryptedKeys }

  for (const provider of PROVIDERS) {
    const value = input.apiKeys?.[provider]
    if (typeof value !== 'string') continue

    const trimmed = value.trim()
    if (!trimmed) {
      delete encryptedKeys[provider]
      continue
    }
    encryptedKeys[provider] = encrypt(trimmed)
  }

  const updated: StoredSettings = {
    defaultProvider: input.defaultProvider ?? current.defaultProvider,
    encryptedKeys,
    updatedAt: new Date().toISOString(),
  }

  await writeSettings(updated)
  return getPublicSettings()
}

/** Uso interno apenas (core/settings/provider-key-service.ts). Nunca serializar numa resposta HTTP. */
export async function getDecryptedApiKey(provider: Provider): Promise<string | null> {
  if (provider === 'ollama') return ''
  const stored = await readSettings()
  const encrypted = stored.encryptedKeys[provider]
  if (!encrypted) return null
  try {
    return decrypt(encrypted)
  } catch {
    return null
  }
}
