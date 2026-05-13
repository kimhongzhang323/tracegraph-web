import { randomBytes, timingSafeEqual } from 'node:crypto'

export function generateCsrfSecret(): string {
  return randomBytes(32).toString('hex')
}

export function validateCsrf(header: string | undefined, cookie: string | undefined): boolean {
  if (!header || !cookie) return false
  try {
    const h = Buffer.from(header)
    const c = Buffer.from(cookie)
    if (h.length !== c.length) return false
    return timingSafeEqual(h, c)
  } catch {
    return false
  }
}
