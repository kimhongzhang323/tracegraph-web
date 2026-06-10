import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sseManager } from './sse'
import { api } from './api'

class MockEventSource {
  onmessage: ((event: MessageEvent) => void) | null = null
  listeners: Record<string, ((event: MessageEvent) => void)[]> = {}
  closeCalled = false
  onerror: ((err: Event) => void) | null = null

  addEventListener(type: string, listener: (e: MessageEvent) => void) {
    if (!this.listeners[type]) {
      this.listeners[type] = []
    }
    this.listeners[type].push(listener)
  }

  removeEventListener(type: string, listener: (e: MessageEvent) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(l => l !== listener)
    }
  }

  close() {
    this.closeCalled = true
  }

  emit(type: string, data: unknown) {
    const event = new MessageEvent(type, { data: JSON.stringify(data) })
    if (type === 'message' && this.onmessage) {
      this.onmessage(event)
    }
    if (this.listeners[type]) {
      this.listeners[type].forEach(l => l(event))
    }
  }

  emitError() {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }
}

describe('sseManager', () => {
  let mockEventSource: MockEventSource | null = null

  beforeEach(() => {
    vi.useFakeTimers()
    sseManager.reset()
    mockEventSource = null
    vi.spyOn(api.traces, 'stream').mockImplementation(() => {
      mockEventSource = new MockEventSource()
      return mockEventSource as unknown as EventSource
    })
  })

  afterEach(() => {
    sseManager.reset()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should not connect to SSE stream if there are no subscribers', () => {
    expect(api.traces.stream).not.toHaveBeenCalled()
  })

  it('should connect to SSE stream on first subscriber', () => {
    const unsubscribe = sseManager.subscribe(vi.fn())
    expect(api.traces.stream).toHaveBeenCalledOnce()
    expect(mockEventSource).not.toBeNull()
    unsubscribe()
  })

  it('should reuse the EventSource connection for multiple subscribers', () => {
    const unsubscribe1 = sseManager.subscribe(vi.fn())
    const unsubscribe2 = sseManager.subscribe(vi.fn())
    expect(api.traces.stream).toHaveBeenCalledOnce()
    unsubscribe1()
    unsubscribe2()
  })

  it('should notify all subscribers on message or Complete event', () => {
    const fn1 = vi.fn()
    const fn2 = vi.fn()
    const unsubscribe1 = sseManager.subscribe(fn1)
    const unsubscribe2 = sseManager.subscribe(fn2)

    expect(mockEventSource).not.toBeNull()
    mockEventSource!.emit('Complete', { id: 'trace-1' })

    expect(fn1).toHaveBeenCalledOnce()
    expect(fn2).toHaveBeenCalledOnce()

    const eventObj = fn1.mock.calls[0][0] as MessageEvent
    expect(JSON.parse(eventObj.data)).toEqual({ id: 'trace-1' })

    unsubscribe1()
    unsubscribe2()
  })

  it('should disconnect after 2000ms delay when subscribers drop to 0', () => {
    const unsubscribe = sseManager.subscribe(vi.fn())
    expect(mockEventSource).not.toBeNull()
    const es = mockEventSource!

    unsubscribe()
    expect(es.closeCalled).toBe(false) // not closed immediately

    vi.advanceTimersByTime(2000)
    expect(es.closeCalled).toBe(true) // closed after 2000ms
  })

  it('should cancel close timer if a new subscriber registers within 2000ms', () => {
    const unsubscribe1 = sseManager.subscribe(vi.fn())
    expect(mockEventSource).not.toBeNull()
    const es = mockEventSource!

    unsubscribe1()
    expect(es.closeCalled).toBe(false)

    vi.advanceTimersByTime(1000)

    const unsubscribe2 = sseManager.subscribe(vi.fn())
    vi.advanceTimersByTime(1500)
    expect(es.closeCalled).toBe(false) // close timer was cancelled

    unsubscribe2()
    vi.advanceTimersByTime(2000)
    expect(es.closeCalled).toBe(true) // closed after the new unsubscribe
  })

  it('should reconnect on error with backoff', () => {
    const unsubscribe = sseManager.subscribe(vi.fn())
    expect(mockEventSource).not.toBeNull()
    const es = mockEventSource!

    es.emitError()
    expect(es.closeCalled).toBe(true) // closes on error
    expect(api.traces.stream).toHaveBeenCalledOnce() // haven't run stream again yet

    vi.advanceTimersByTime(2000) // advance past reconnect delay
    expect(api.traces.stream).toHaveBeenCalledTimes(2) // reconnected!

    unsubscribe()
  })
})
