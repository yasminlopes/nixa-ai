import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

export type LLMProvider = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'huggingface' | 'ollama'

type EncryptedSettings = {
  defaultProvider: LLMProvider
  encryptedKeys: Partial<Record<LLMProvider, string>>
  updatedAt: string
}

export type PublicLLMSettings = {
  defaultProvider: LLMProvider
  hasKeys: Record<LLMProvider, boolean>
  updatedAt: string | null
}

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'llm-settings.json')
const PROVIDERS: LLMProvider[] = ['gemini', 'openai', 'anthropic', 'groq', 'huggingface', 'ollama']

function getCipherKey(): Buffer {
  const secret = process.env.LLM_SETTINGS_MASTER_KEY
  if (!secret) {
    throw new Error('LLM_SETTINGS_MASTER_KEY missing')
  }

  // Derive a fixed 256-bit key from the configured secret.
  return crypto.createHash('sha256').update(secret).digest()
}

function encrypt(plain: string): string {
  const key = getCipherKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`
}

function decrypt(payload: string): string {
  const [ivB64, tagB64, contentB64] = payload.split('.')
  if (!ivB64 || !tagB64 || !contentB64) {
    throw new Error('Invalid encrypted payload format')
  }

  const key = getCipherKey()
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const content = Buffer.from(contentB64, 'base64')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([decipher.update(content), decipher.final()])
  return decrypted.toString('utf8')
}

async function readSettings(): Promise<EncryptedSettings | null> {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, 'utf-8')
    return JSON.parse(raw) as EncryptedSettings
  } catch {
    return null
  }
}

async function writeSettings(settings: EncryptedSettings): Promise<void> {
  await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true })
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8')
}

export async function getPublicLLMSettings(): Promise<PublicLLMSettings> {
  const settings = await readSettings()
  const encryptedKeys = settings?.encryptedKeys ?? {}

  return {
    defaultProvider: settings?.defaultProvider ?? 'gemini',
    hasKeys: {
      gemini: Boolean(encryptedKeys.gemini),
      openai: Boolean(encryptedKeys.openai),
      anthropic: Boolean(encryptedKeys.anthropic),
      groq: Boolean(encryptedKeys.groq),
      huggingface: Boolean(encryptedKeys.huggingface),
      ollama: true,
    },
    updatedAt: settings?.updatedAt ?? null,
  }
}

export async function saveLLMSettings(input: {
  defaultProvider: LLMProvider
  apiKeys?: Partial<Record<LLMProvider, string>>
}): Promise<PublicLLMSettings> {
  if (!PROVIDERS.includes(input.defaultProvider)) {
    throw new Error('Invalid defaultProvider')
  }

  const current = await readSettings()
  const encryptedKeys: Partial<Record<LLMProvider, string>> = {
    ...(current?.encryptedKeys ?? {}),
  }

  for (const provider of PROVIDERS) {
    const keyValue = input.apiKeys?.[provider]
    if (typeof keyValue !== 'string') continue

    const trimmed = keyValue.trim()
    if (!trimmed) {
      delete encryptedKeys[provider]
      continue
    }

    encryptedKeys[provider] = encrypt(trimmed)
  }

  const updated: EncryptedSettings = {
    defaultProvider: input.defaultProvider,
    encryptedKeys,
    updatedAt: new Date().toISOString(),
  }

  await writeSettings(updated)
  return getPublicLLMSettings()
}

export async function getProviderApiKey(provider: LLMProvider): Promise<string | null> {
  const settings = await readSettings()
  const encrypted = settings?.encryptedKeys?.[provider]
  if (!encrypted) return null

  try {
    return decrypt(encrypted)
  } catch {
    return null
  }
}

export async function getDefaultProvider(): Promise<LLMProvider> {
  const settings = await readSettings()
  return settings?.defaultProvider ?? 'gemini'
}
