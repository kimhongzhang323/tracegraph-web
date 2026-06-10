import { getRedis } from './redis.js'

const THRESHOLD = 10
const WINDOW_SEC = 15 * 60
const LOCKOUT_SEC = 15 * 60

interface FailRecord { count: number; first: number; lockedUntil?: number }
const devStore = new Map<string, FailRecord>()

function devKey(email: string) { return `lockout:${email.toLowerCase()}` }

export async function isLocked(email: string): Promise<boolean> {
  const redis = getRedis()
  if (redis) {
    try {
      const locked = await redis.get<string>(`lockout:locked:${email.toLowerCase()}`)
      return locked !== null
    } catch {
      // Fallback to in-memory store on redis connection failures
    }
  }

  const rec = devStore.get(devKey(email))
  if (!rec?.lockedUntil) return false
  if (Date.now() > rec.lockedUntil) {
    devStore.delete(devKey(email))
    return false
  }
  return true
}

export async function recordFailure(email: string): Promise<void> {
  const redis = getRedis()
  const lowercaseEmail = email.toLowerCase()
  if (redis) {
    try {
      const countKey = `lockout:count:${lowercaseEmail}`
      const lockedKey = `lockout:locked:${lowercaseEmail}`
      
      const count = await redis.incr(countKey)
      if (count === 1) {
        await redis.expire(countKey, WINDOW_SEC)
      }
      
      if (count >= THRESHOLD) {
        await redis.set(lockedKey, 'true', { ex: LOCKOUT_SEC })
        await redis.del(countKey)
      }
      return
    } catch {
      // Fallback to in-memory store on failures
    }
  }

  const k = devKey(email)
  const now = Date.now()
  const rec = devStore.get(k) ?? { count: 0, first: now }
  if (now - rec.first > WINDOW_SEC * 1000) {
    rec.count = 0
    rec.first = now
  }
  rec.count++
  if (rec.count >= THRESHOLD) {
    rec.lockedUntil = now + LOCKOUT_SEC * 1000
  }
  devStore.set(k, rec)
}

export async function recordSuccess(email: string): Promise<void> {
  const redis = getRedis()
  const lowercaseEmail = email.toLowerCase()
  if (redis) {
    try {
      await redis.del(`lockout:count:${lowercaseEmail}`, `lockout:locked:${lowercaseEmail}`)
      return
    } catch {
      // Fallback to in-memory store on failures
    }
  }

  devStore.delete(devKey(email))
}
