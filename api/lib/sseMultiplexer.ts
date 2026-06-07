import { EventEmitter } from 'events'

interface StreamInfo {
  eventEmitter: EventEmitter
  controller: AbortController
  refCount: number
}

class SSEMultiplexer {
  private activeStreams = new Map<string, StreamInfo>()

  async getStream(userId: string, targetUrl: string, jwt: string): Promise<ReadableStream> {
    const streamKey = `${userId}:${targetUrl}`
    let streamInfo = this.activeStreams.get(streamKey)

    if (!streamInfo) {
      const eventEmitter = new EventEmitter()
      eventEmitter.setMaxListeners(100)
      const controller = new AbortController()

      streamInfo = {
        eventEmitter,
        controller,
        refCount: 0,
      }
      this.activeStreams.set(streamKey, streamInfo)

      this.startUpstreamConnection(targetUrl, jwt, streamInfo).catch((err) => {
        console.error('SSE Upstream connection error:', err)
        eventEmitter.emit('error', err)
        this.cleanupStream(streamKey)
      })
    }

    streamInfo.refCount++

    const emitter = streamInfo.eventEmitter
    const currentStreamInfo = streamInfo

    let cleanupListeners: (() => void) | null = null

    return new ReadableStream({
      start(controller) {
        const onEvent = (event: { event: string; data: string }) => {
          try {
            const chunk = `event: ${event.event}\ndata: ${event.data}\n\n`
            controller.enqueue(new TextEncoder().encode(chunk))
          } catch {
            // stream controller might already be closed/cancelled
          }
        }

        const onError = (err: unknown) => {
          controller.error(err)
        }

        emitter.on('sse_event', onEvent)
        emitter.on('error', onError)

        cleanupListeners = () => {
          emitter.off('sse_event', onEvent)
          emitter.off('error', onError)
        }
      },
      cancel() {
        if (cleanupListeners) cleanupListeners()

        currentStreamInfo.refCount--
        if (currentStreamInfo.refCount <= 0) {
          const active = sseMultiplexer.activeStreams.get(streamKey)
          if (active === currentStreamInfo) {
            sseMultiplexer.cleanupStream(streamKey)
          }
        }
      },
    })
  }

  private cleanupStream(key: string) {
    const info = this.activeStreams.get(key)
    if (info) {
      info.controller.abort()
      info.eventEmitter.removeAllListeners()
      this.activeStreams.delete(key)
    }
  }

  private async startUpstreamConnection(targetUrl: string, jwt: string, info: StreamInfo) {
    const url = `${targetUrl}/tracegraph/traces/stream`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      signal: info.controller.signal,
    })

    if (!res.ok) {
      throw new Error(`Failed to connect to upstream SSE: ${res.statusText}`)
    }

    const reader = res.body?.getReader()
    if (!reader) {
      throw new Error('Upstream response has no body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        let currentEvent = 'message'
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.slice(6).trim()
          } else if (trimmed.startsWith('data:')) {
            const data = trimmed.slice(5).trim()
            info.eventEmitter.emit('sse_event', { event: currentEvent, data })
            currentEvent = 'message'
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}

export const sseMultiplexer = new SSEMultiplexer()
