// @vitest-environment node
// Node env is required so MSW v2's `instanceof AbortSignal` check passes.
// JSDOM replaces globalThis.AbortSignal with its own polyfill which breaks MSW.
import { describe, it, expect, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { api, ApiError } from './api'

// VITE_API_BASE_URL is set to 'http://localhost' via vitest.config.ts define.
// MSW handlers in handlers.ts use that same base, so requests are intercepted.
// In node env document is not defined; stub it for the CSRF cookie read.
vi.stubGlobal('document', { cookie: '' })

describe('ApiError', () => {
  it('has correct status, name, and inherits from Error', () => {
    const err = new ApiError(404, 'Not found')
    expect(err.status).toBe(404)
    expect(err.message).toBe('Not found')
    expect(err.name).toBe('ApiError')
    expect(err).toBeInstanceOf(Error)
  })
})

describe('api client', () => {
  it('throws ApiError on non-2xx response', async () => {
    server.use(
      http.get('http://localhost/api/traces', () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    )
    await expect(api.traces.list()).rejects.toMatchObject({ name: 'ApiError', status: 500 })
  })

  it('parses JSON responses', async () => {
    const result = await api.traces.list()
    expect(result).toEqual({ items: ['trace-1', 'trace-2'], total: 2 })
  })

  it('deduplicates concurrent GET requests to the same URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const [a, b] = await Promise.all([api.traces.list(), api.traces.list()])
    expect(a).toEqual(b)
    const tracesCalls = fetchSpy.mock.calls.filter(([url]) =>
      String(url).includes('/api/traces?limit=20'),
    )
    expect(tracesCalls.length).toBe(1)
    fetchSpy.mockRestore()
  })

  it('makes a new fetch after the first GET resolves', async () => {
    await api.traces.list()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await api.traces.list()
    expect(fetchSpy).toHaveBeenCalledOnce()
    fetchSpy.mockRestore()
  })

  it('does not send x-csrf-token on GET requests', async () => {
    let csrfHeader: string | null = 'not-checked'
    server.use(
      http.get('http://localhost/api/traces', ({ request }) => {
        csrfHeader = request.headers.get('x-csrf-token')
        return HttpResponse.json({ items: [], total: 0 })
      }),
    )
    await api.traces.list()
    expect(csrfHeader).toBeNull()
  })

  it('sends x-csrf-token header on POST requests', async () => {
    let csrfHeader: string | null = null
    server.use(
      http.post('http://localhost/api/traces/:id/replay', ({ request }) => {
        csrfHeader = request.headers.get('x-csrf-token')
        return HttpResponse.json({ executionId: 'ex-1' })
      }),
    )
    await api.traces.replay('trace-1')
    // document.cookie stubbed as '' → CSRF token is empty string, header is sent
    expect(typeof csrfHeader).toBe('string')
  })

  it('returns plain text for text/plain responses', async () => {
    server.use(
      http.get('http://localhost/api/graph/mermaid', () =>
        new HttpResponse('graph TD; A-->B', {
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    )
    const result = await api.graph.mermaid()
    expect(result).toBe('graph TD; A-->B')
  })
})
