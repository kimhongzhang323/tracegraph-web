import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { TOTP } from 'otpauth'

const KEY_B64 = process.env.MFA_ENCRYPTION_KEY ?? ''

function getKey(): Buffer {
  const key = Buffer.from(KEY_B64, 'base64')
  if (key.length !== 32) throw new Error('MFA_ENCRYPTION_KEY must be 32 bytes base64')
  return key
}

export function encryptSecret(secret: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv)
  const enc = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decryptSecret(enc: string): string {
  const buf = Buffer.from(enc, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const data = buf.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

export function generateTotpSecret(): string {
  return new TOTP({ issuer: 'TraceGraph', label: 'user' }).secret.base32
}

export function getTotpUri(secret: string, email: string): string {
  return new TOTP({ issuer: 'TraceGraph', label: email, secret }).toString()
}

export function verifyTotp(secret: string, code: string): boolean {
  const totp = new TOTP({ issuer: 'TraceGraph', label: '', secret })
  return totp.validate({ token: code, window: 1 }) !== null
}
