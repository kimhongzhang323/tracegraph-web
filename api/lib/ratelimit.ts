import { Redis } from '@upstash/redis'
import { Ratelimit, type Duration } from '@upstash/ratelimit'

function getRedis(): Redis {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('UPSTASH_REDIS_REST_URL / TOKEN not set — add them to .env.local')
  return new Redis({ url, token })
}


function makeLimiter(window: Duration, limit: number, prefix: string) {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix,
  })
}

export const loginLimiter         = { limit: (key: string) => makeLimiter('15 m', 5, 'rl:login').limit(key) }
export const registerLimiter      = { limit: (key: string) => makeLimiter('1 h',  3, 'rl:register').limit(key) }
export const magicLinkLimiter     = { limit: (key: string) => makeLimiter('1 h',  3, 'rl:magic').limit(key) }
export const passwordResetLimiter = { limit: (key: string) => makeLimiter('1 h',  3, 'rl:pwreset').limit(key) }

export async function checkLimit(
  limiter: { limit: (key: string) => Promise<{ success: boolean; reset: number }> },
  key: string,
): Promise<{ ok: boolean; reset: number }> {
  try {
    const result = await limiter.limit(key)
    return { ok: result.success, reset: result.reset }
  } catch {
    // If Redis is unavailable (e.g. local dev without Upstash), allow the request
    return { ok: true, reset: 0 }
  }
}
