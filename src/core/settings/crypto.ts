import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
// Salt fixo e não-secreto: só existe pra dar contexto de domínio à derivação
// de chave (scrypt). O segredo de verdade é SETTINGS_ENCRYPTION_KEY.
const KDF_SALT = 'nixa-ai:settings:v1'

let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey

  const secret = process.env.SETTINGS_ENCRYPTION_KEY
  if (!secret || secret.trim().length < 16) {
    throw new Error(
      'SETTINGS_ENCRYPTION_KEY não configurada (ou curta demais). Defina uma string longa e aleatória no .env.'
    )
  }

  cachedKey = crypto.scryptSync(secret, KDF_SALT, 32)
  return cachedKey
}

/** Criptografa uma string em `iv.tag.ciphertext` (tudo base64). */
export function encrypt(plainText: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`
}

/** Reverte o formato produzido por `encrypt`. Lança se o payload for inválido ou a tag não bater. */
export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.')
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Payload criptografado em formato inválido')
  }

  const key = getKey()
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return decrypted.toString('utf8')
}
