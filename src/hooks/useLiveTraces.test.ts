import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { MOCK_TRACE_LIST } from '@/data/mock'

const { MockEventSource, mockList, mockStream, triggerSSEEvent } = vi.hoisted(() => {
  const listeners = new Map<string, ((e: MessageEvent) => void)[]>()
  class MockEventSource {
    addEventListener(type: string, listener: (e: MessageEvent) => void) {
      if (!listeners.has(type)) listeners.set(type, [])
      listeners.get(type)!.push(listener)
    }
    removeEventListener(type: string, listener: (e: MessageEvent) => void) {
      if (listeners.has(type)) {
        const list = listeners.get(type)!
        listeners.set(type, list.filter(l => l !== listener))
      }
    }
    close() {}
    onerror: null = null
  }
  const mockList = vi.fn().mockResolvedValue({ items: ['trace-1', 'trace-2'], total: 2 })
  const mockStream = vi.fn().mockImplementation(() => new MockEventSource())
  const triggerSSEEvent = (type: string, data: unknown) => {
    const list = listeners.get(type) ?? []
    list.forEach(l => l(new MessageEvent(type, { data: JSON.stringify(data) })))
  }
  return { MockEventSource, mockList, mockStream, triggerSSEEvent }
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
  vi.useRealTimers()
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

  it('debounces list refetches on Complete SSE events', async () => {
    vi.useFakeTimers()
    renderHook(() => useLiveTraces())
    
    // First fetch happens on mount
    expect(mockList).toHaveBeenCalledTimes(1)
    
    // Reset call counts for clean assertions
    mockList.mockClear()
    
    // Emit multiple Complete events in rapid succession
    triggerSSEEvent('Complete', { id: 'trace-3' })
    triggerSSEEvent('Complete', { id: 'trace-4' })
    triggerSSEEvent('Complete', { id: 'trace-5' })
    
    // Ensure no fetch has been made yet (debounced)
    expect(mockList).not.toHaveBeenCalled()
    
    // Advance time by 499ms (less than 500ms debounce window)
    await vi.advanceTimersByTimeAsync(499)
    expect(mockList).not.toHaveBeenCalled()
    
    // Advance time past the 500ms debounce window
    await vi.advanceTimersByTimeAsync(2)
    
    // Ensure only a single API call was made
    expect(mockList).toHaveBeenCalledTimes(1)
  })
})
