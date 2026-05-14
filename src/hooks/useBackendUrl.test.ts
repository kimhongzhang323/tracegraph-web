import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const { mockRefresh } = vi.hoisted(() => {
  const mockRefresh = vi.fn()
  return { mockRefresh }
})

vi.mock('@/contexts/authContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'a@b.com', mfaEnabled: false, backendUrl: 'http://localhost:8082' },
    refresh: mockRefresh,
  }),
}))

// Import after vi.mock to pick up the mocked module
const { useBackendUrl } = await import('./useBackendUrl')

describe('useBackendUrl', () => {
  beforeEach(() => {
    mockRefresh.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns backendUrl from auth context', () => {
    const { result } = renderHook(() => useBackendUrl())
    expect(result.current.backendUrl).toBe('http://localhost:8082')
  })

  it('test() returns ok:true on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true }),
    }))
    const { result } = renderHook(() => useBackendUrl())
    let res: { ok: boolean; error?: string }
    await act(async () => { res = await result.current.test('http://localhost:8082') })
    expect(res!.ok).toBe(true)
  })

  it('test() sets error on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: false, error: 'Connection refused' }),
    }))
    const { result } = renderHook(() => useBackendUrl())
    await act(async () => { await result.current.test('http://bad-url') })
    expect(result.current.error).toBe('Connection refused')
  })

  it('save() calls PATCH and refreshes auth', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ backendUrl: 'http://new:8082' }),
    }))
    const { result } = renderHook(() => useBackendUrl())
    await act(async () => { await result.current.save('http://new:8082') })
    expect(mockRefresh).toHaveBeenCalledOnce()
  })

  it('clear() saves null', async () => {
    let capturedBody: unknown
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url: string, opts: RequestInit) => {
      capturedBody = JSON.parse(opts.body as string)
      return { ok: true, json: () => Promise.resolve({ backendUrl: null }) }
    }))
    const { result } = renderHook(() => useBackendUrl())
    await act(async () => { await result.current.clear() })
    expect((capturedBody as { backendUrl: unknown }).backendUrl).toBeNull()
  })
})
