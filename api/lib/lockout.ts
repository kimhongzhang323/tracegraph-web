// api/lib/lockout.ts
// Tracks consecutive login failures per email. After 10 failures in 15 min,
// account is temporarily locked. Uses in-process Map as fallback when Redis
// is unavailable (dev without Upstash).

const THRESHOLD = 10
const WINDOW_MS = 15 * 60 * 1000
const LOCKOUT_MS = 15 * 60 * 1000

interface FailRecord { count: number; first: number; lockedUntil?: number }
const store = new Map<string, FailRecord>()

function key(email: string) { return `lockout:${email.toLowerCase()}` }

export function isLocked(email: string): boolean {
  const rec = store.get(key(email))
  if (!rec?.lockedUntil) return false
  if (Date.now() > rec.lockedUntil) { store.delete(key(email)); return false }
  return true
}

export function recordFailure(email: string): void {
  const k = key(email)
  const now = Date.now()
  const rec = store.get(k) ?? { count: 0, first: now }
  if (now - rec.first > WINDOW_MS) { rec.count = 0; rec.first = now }
  rec.count++
  if (rec.count >= THRESHOLD) rec.lockedUntil = now + LOCKOUT_MS
  store.set(k, rec)
}

export function recordSuccess(email: string): void {
  store.delete(key(email))
}
