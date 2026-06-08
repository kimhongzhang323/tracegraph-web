// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { audit } from './audit.js'
import { db } from '../db/index.js'

vi.mock('../db/index.js', () => {
  const mockDb = {} as any
  mockDb.insert = vi.fn(() => mockDb)
  mockDb.values = vi.fn().mockResolvedValue({})
  return {
    db: mockDb,
    auditLog: {},
  }
})

describe('audit library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs asynchronously and uses c.executionCtx.waitUntil when available', async () => {
    const waitUntilSpy = vi.fn()
    const mockContext = {
      executionCtx: {
        waitUntil: waitUntilSpy,
      },
    } as any

    audit(mockContext, 'login.success', { userId: '123', ip: '1.2.3.4' })

    expect(waitUntilSpy).toHaveBeenCalledOnce()
    
    const promise = waitUntilSpy.mock.calls[0][0]
    await promise

    expect(db.insert).toHaveBeenCalledOnce()
    expect((db as any).values).toHaveBeenCalledWith({
      userId: '123',
      event: 'login.success',
      ip: '1.2.3.4',
      ua: undefined,
      meta: null,
    })
  })

  it('runs fire-and-forget in background when c is undefined', async () => {
    audit(undefined, 'logout', { userId: '456' })

    // Give it a tiny moment to execute the microtask
    await new Promise((resolve) => setTimeout(resolve, 5))

    expect(db.insert).toHaveBeenCalledOnce()
    expect((db as any).values).toHaveBeenCalledWith({
      userId: '456',
      event: 'logout',
      ip: undefined,
      ua: undefined,
      meta: null,
    })
  })
})
