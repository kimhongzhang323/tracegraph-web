// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { generateKeyPairSync } from 'node:crypto'
import { mintInternalJwt, verifyInternalJwt } from './jwt.js'

const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
})

process.env.INTERNAL_JWT_PRIVATE_KEY = privateKey
process.env.INTERNAL_JWT_PUBLIC_KEY = publicKey

describe('jwt library', () => {
  it('mints and verifies a valid internal JWT', async () => {
    const token = await mintInternalJwt('user-1', 'test@example.com')
    expect(typeof token).toBe('string')

    const payload = await verifyInternalJwt(token)
    expect(payload.sub).toBe('user-1')
    expect(payload.email).toBe('test@example.com')
  })

  it('caches the token and returns the cached one on consecutive calls', async () => {
    const token1 = await mintInternalJwt('user-2', 'test2@example.com')
    const token2 = await mintInternalJwt('user-2', 'test2@example.com')
    expect(token1).toBe(token2)
  })

  it('mints a new token if email changes', async () => {
    const token1 = await mintInternalJwt('user-3', 'old@example.com')
    const token2 = await mintInternalJwt('user-3', 'new@example.com')
    expect(token1).not.toBe(token2)
  })

  it('evicts expired tokens from cache and mints a new one', async () => {
    vi.useFakeTimers()
    const token1 = await mintInternalJwt('user-4', 'timer@example.com')
    
    // Fast forward past cache validity (60s TTL)
    vi.advanceTimersByTime(65 * 1000)

    const token2 = await mintInternalJwt('user-4', 'timer@example.com')
    expect(token1).not.toBe(token2)
    
    vi.useRealTimers()
  })
})
