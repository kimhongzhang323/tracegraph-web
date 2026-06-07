import { getRedis } from './redis.js'

const localCache = new Map<string, { data: string; contentType: string; status: number; timestamp: number }>()
const LOCAL_VERSION_CACHE = new Map<string, string>()

const TTL_MS = 15_000 // 15 seconds cache TTL

async function getUserCacheVersion(userId: string): Promise<string> {
  const redis = getRedis()
  if (redis) {
    try {
      let ver = await redis.get<string>(`cver:${userId}`)
      if (!ver) {
        ver = Date.now().toString()
        await redis.set(`cver:${userId}`, ver, { ex: 3600 })
      }
      return ver
    } catch (err) {
      console.error('Redis get cache version failed, falling back:', err)
    }
  }

  let localVer = LOCAL_VERSION_CACHE.get(userId)
  if (!localVer) {
    localVer = Date.now().toString()
    LOCAL_VERSION_CACHE.set(userId, localVer)
  }
  return localVer
}

export async function invalidateUserCache(userId: string) {
  const newVer = Date.now().toString()
  const redis = getRedis()
  if (redis) {
    try {
      await redis.set(`cver:${userId}`, newVer, { ex: 3600 })
    } catch (err) {
      console.error('Redis set cache version failed:', err)
    }
  }
  LOCAL_VERSION_CACHE.set(userId, newVer)
}

interface CachedResponse {
  body: string
  contentType: string
  status: number
}

export async function getCachedResponse(userId: string, path: string, query: string): Promise<CachedResponse | null> {
  const version = await getUserCacheVersion(userId)
  const key = `cval:${userId}:${version}:${path}:${query}`

  const redis = getRedis()
  if (redis) {
    try {
      const cached = await redis.get<CachedResponse>(key)
      if (cached) return cached
    } catch (err) {
      console.error('Redis get cached response failed:', err)
    }
  }

  const localVal = localCache.get(key)
  if (localVal) {
    if (Date.now() - localVal.timestamp < TTL_MS) {
      return { body: localVal.data, contentType: localVal.contentType, status: localVal.status }
    } else {
      localCache.delete(key)
    }
  }
  return null
}

export async function setCachedResponse(userId: string, path: string, query: string, res: CachedResponse) {
  const version = await getUserCacheVersion(userId)
  const key = `cval:${userId}:${version}:${path}:${query}`

  const redis = getRedis()
  if (redis) {
    try {
      await redis.set(key, res, { ex: 15 }) // expire in 15s
    } catch (err) {
      console.error('Redis set cached response failed:', err)
    }
  }

  localCache.set(key, {
    data: res.body,
    contentType: res.contentType,
    status: res.status,
    timestamp: Date.now(),
  })
}
