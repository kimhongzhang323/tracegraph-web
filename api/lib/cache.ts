import { getRedis } from './redis.js'

class BoundedMap<K, V> {
  private map = new Map<K, V>()
  constructor(private maxEntries: number) {}

  get(key: K): V | undefined {
    const val = this.map.get(key)
    if (val !== undefined) {
      this.map.delete(key)
      this.map.set(key, val)
    }
    return val
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key)
    } else if (this.map.size >= this.maxEntries) {
      const oldestKey = this.map.keys().next().value
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey)
      }
    }
    this.map.set(key, value)
  }

  delete(key: K): boolean {
    return this.map.delete(key)
  }

  entries() {
    return this.map.entries()
  }

  get size() {
    return this.map.size
  }
}

const localCache = new BoundedMap<string, { data: string; contentType: string; status: number; timestamp: number }>(1000)
const LOCAL_VERSION_CACHE = new BoundedMap<string, string>(1000)

const TTL_MS = 15_000 // 15 seconds cache TTL

// Periodic sweep to clean up expired entries from localCache
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of localCache.entries()) {
    if (now - val.timestamp > TTL_MS) {
      localCache.delete(key)
    }
  }
}, 30_000).unref()

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
    // Fail loud on Redis SET failure (do not catch and swallow the error)
    await redis.set(`cver:${userId}`, newVer, { ex: 3600 })
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
      console.error('Redis get cached response failed, falling back to local:', err)
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
