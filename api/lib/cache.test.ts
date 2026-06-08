// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCachedResponse, setCachedResponse, invalidateUserCache } from './cache'

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
}

vi.mock('./redis.js', () => ({
  getRedis: () => mockRedis,
}))

describe('cache library', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.restoreAllMocks()
  })

  it('sets and gets local cache fallback when Redis is not available', async () => {
    vi.spyOn(await import('./redis.js'), 'getRedis').mockReturnValue(null)

    const userId = 'user-local'
    const res = { body: 'local-data', contentType: 'text/html', status: 200 }
    
    await setCachedResponse(userId, '/path', 'query', res)
    const cached = await getCachedResponse(userId, '/path', 'query')
    expect(cached).toEqual(res)
  })

  it('evicts expired local cache entries', async () => {
    vi.spyOn(await import('./redis.js'), 'getRedis').mockReturnValue(null)

    const userId = 'user-expired'
    const res = { body: 'expired-data', contentType: 'text/html', status: 200 }
    
    vi.useFakeTimers()
    await setCachedResponse(userId, '/path', 'query', res)
    
    // Fast-forward past TTL (15 seconds)
    vi.advanceTimersByTime(20_000)
    
    const cached = await getCachedResponse(userId, '/path', 'query')
    expect(cached).toBeNull()
    
    vi.useRealTimers()
  })

  it('uses Redis cache when Redis is available', async () => {
    const userId = 'user-redis'
    const res = { body: 'redis-data', contentType: 'application/json', status: 200 }

    mockRedis.get.mockResolvedValueOnce('version-123') // for getUserCacheVersion
    mockRedis.get.mockResolvedValueOnce(res) // for getCachedResponse

    const cached = await getCachedResponse(userId, '/path', 'query')
    expect(cached).toEqual(res)
    expect(mockRedis.get).toHaveBeenCalledTimes(2)
  })

  it('fails loud when Redis SET fails in invalidateUserCache', async () => {
    const userId = 'user-fail-loud'
    mockRedis.set.mockRejectedValueOnce(new Error('Redis is down'))

    await expect(invalidateUserCache(userId)).rejects.toThrow('Redis is down')
  })
})
