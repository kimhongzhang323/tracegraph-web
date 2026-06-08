// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Hono } from 'hono'
import { describe, it, expect } from 'vitest'
import { requestSizeLimit } from './requestSize.js'

describe('requestSizeLimit middleware', () => {
  it('allows request when content-length is under limit', async () => {
    const app = new Hono()
    app.use('*', requestSizeLimit)
    app.post('/test', (c) => c.text('ok'))

    const res = await app.request('/test', {
      method: 'POST',
      headers: {
        'content-length': '1000',
      },
      body: 'a'.repeat(1000),
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })

  it('blocks request when content-length exceeds limit', async () => {
    const app = new Hono()
    app.use('*', requestSizeLimit)
    app.post('/test', (c) => c.text('ok'))

    // Max limit is 64 KB (65536 bytes)
    const res = await app.request('/test', {
      method: 'POST',
      headers: {
        'content-length': '70000',
      },
      body: 'a'.repeat(70000),
    })
    expect(res.status).toBe(413)
    expect(await res.json()).toEqual({ error: 'Request body too large' })
  })

  it('allows chunked stream body under limit', async () => {
    const app = new Hono()
    app.use('*', requestSizeLimit)
    app.post('/test', (c) => c.text('ok'))

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('a'.repeat(1000)))
        controller.close()
      },
    })

    const res = await app.request('/test', {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as any)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })

  it('blocks chunked stream body exceeding limit', async () => {
    const app = new Hono()
    app.use('*', requestSizeLimit)
    app.post('/test', (c) => c.text('ok'))

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('a'.repeat(40000)))
        controller.enqueue(new TextEncoder().encode('a'.repeat(30000)))
        controller.close()
      },
    })

    const res = await app.request('/test', {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as any)
    expect(res.status).toBe(413)
    expect(await res.json()).toEqual({ error: 'Request body too large' })
  })
})
