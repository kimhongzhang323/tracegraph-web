import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto'
import { createHash } from 'node:crypto'

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex')
}

// HMAC-bound magic link tokens
export function generateMagicToken(userId: string, email: string): string {
  const raw = generateOpaqueToken(24)
  const hmac = createHmac('sha256', process.env.SESSION_SECRET!)
    .update(`${userId}:${email}:${raw}`)
    .digest('base64url')
  return `${raw}.${hmac}`
}

export function verifyMagicToken(token: string, userId: string, email: string): boolean {
  const [raw, hmac] = token.split('.')
  if (!raw || !hmac) return false
  const expected = createHmac('sha256', process.env.SESSION_SECRET!)
    .update(`${userId}:${email}:${raw}`)
    .digest('base64url')
  try {
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(expected))
  } catch {
    return false
  }
}
