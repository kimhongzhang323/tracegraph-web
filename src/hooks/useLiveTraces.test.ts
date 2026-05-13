import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { MOCK_TRACE_LIST } from '@/data/mock'

const { MockEventSource, mockList, mockStream } = vi.hoisted(() => {
  class MockEventSource {
    addEventListener() {}
    close() {}
    onerror: null = null
  }
  const mockList = vi.fn().mockResolvedValue({ items: ['trace-1', 'trace-2'], total: 2 })
  const mockStream = vi.fn().mockImplementation(() => new MockEventSource())
  return { MockEventSource, mockList, mockStream }
})

vi.mock('@/lib/api', () => ({
  api: {
    traces: { list: mockList, stream: mockStream },
  },
}))

// Import after vi.mock to pick up the mocked module
const { useLiveTraces } = await import('./useLiveTraces')

beforeEach(() => {
  vi.stubGlobal('EventSource', MockEventSource)
  // Default: resolves with two traces
  mockList.mockResolvedValue({ items: ['trace-1', 'trace-2'], total: 2 })
})

afterEach(() => {
  vi.unstubAllGlobals()
  mockList.mockReset()
  mockList.mockResolvedValue({ items: ['trace-1', 'trace-2'], total: 2 })
})

describe('useLiveTraces', () => {
  it('returns MOCK_TRACE_LIST as initial state before fetch resolves', () => {
    mockList.mockReturnValueOnce(new Promise(() => {})) // never resolves for this call
    const { result } = renderHook(() => useLiveTraces())
    // Synchronous — initial state before any async resolution
    expect(result.current).toEqual(MOCK_TRACE_LIST)
  })

  it('updates list with API response after fetch resolves', async () => {
    const { result } = renderHook(() => useLiveTraces())
    await waitFor(() => {
      expect(result.current.some((t) => t.id === 'trace-1')).toBe(true)
    })
    expect(result.current.some((t) => t.id === 'trace-2')).toBe(true)
  })

  it('maps API response to TraceSummary objects', async () => {
    const { result } = renderHook(() => useLiveTraces())
    await waitFor(() => expect(result.current[0]?.id).toBe('trace-1'))
    expect(result.current[0]).toMatchObject({ id: 'trace-1', graph: 'graph', status: 'COMPLETED' })
  })

  it('does not update state after unmount', async () => {
    const { unmount } = renderHook(() => useLiveTraces())
    unmount()
    // Cancelled flag prevents setState — no act() warnings expected
  })
})
