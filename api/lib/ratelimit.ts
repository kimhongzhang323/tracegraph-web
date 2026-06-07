import { getRedis } from './redis.js'
import { Ratelimit, type Duration } from '@upstash/ratelimit'

function makeLimiter(window: Duration, limit: number, prefix: string) {
  const redis = getRedis()
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix,
  })
}

export const loginLimiter         = { limit: (key: string) => makeLimiter('15 m', 5, 'rl:login')?.limit(key) }
export const registerLimiter      = { limit: (key: string) => makeLimiter('1 h',  3, 'rl:register')?.limit(key) }
export const magicLinkLimiter     = { limit: (key: string) => makeLimiter('1 h',  3, 'rl:magic')?.limit(key) }
export const passwordResetLimiter = { limit: (key: string) => makeLimiter('1 h',  3, 'rl:pwreset')?.limit(key) }

export async function checkLimit(
  limiter: { limit: (key: string) => Promise<{ success: boolean; reset: number }> | undefined },
  key: string,
  failClosed = false,
): Promise<{ ok: boolean; reset: number }> {
  try {
    const p = limiter.limit(key)
    if (!p) return { ok: true, reset: 0 }
    const result = await p
    return { ok: result.success, reset: result.reset }
  } catch (err) {
    console.error(`Rate limiter error for key ${key} (failClosed: ${failClosed}):`, err)
    if (failClosed) {
      return { ok: false, reset: Date.now() + 60000 }
    }
    return { ok: true, reset: 0 }
  }
}
