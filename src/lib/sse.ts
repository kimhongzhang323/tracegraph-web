import { api } from './api.js'

type SSEListener = (event: MessageEvent) => void

class SSEManager {
  private es: EventSource | null = null
  private listeners = new Set<SSEListener>()
  private closeTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private backoff = 1000
  private maxBackoff = 30000

  subscribe(listener: SSEListener): () => void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer)
      this.closeTimer = null
    }

    this.listeners.add(listener)

    if (!this.es && !this.reconnectTimer) {
      this.connect()
    }

    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0) {
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer)
          this.reconnectTimer = null
        }
        this.closeTimer = setTimeout(() => {
          this.disconnect()
        }, 2000)
      }
    }
  }

  private connect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    try {
      this.es = api.traces.stream()
    } catch (err) {
      console.error('Failed to create EventSource:', err)
      this.scheduleReconnect()
      return
    }

    if (!this.es) return

    const handleEvent = (e: MessageEvent) => {
      this.backoff = 1000
      this.listeners.forEach((listener) => {
        try {
          listener(e)
        } catch (err) {
          console.error('SSE listener error:', err)
        }
      })
    }

    this.es.onmessage = handleEvent
    this.es.addEventListener('Complete', handleEvent)

    this.es.onerror = () => {
      this.disconnect()
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.listeners.size === 0) return
    if (this.reconnectTimer) return

    const jitter = Math.random() * 0.3 * this.backoff
    const delay = this.backoff + jitter

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.backoff = Math.min(this.backoff * 2, this.maxBackoff)
      this.connect()
    }, delay)
  }

  private disconnect() {
    if (this.es) {
      this.es.close()
      this.es = null
    }
  }

  /** For testing purposes only to ensure test isolation */
  reset() {
    this.disconnect()
    this.listeners.clear()
    if (this.closeTimer) {
      clearTimeout(this.closeTimer)
      this.closeTimer = null
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.backoff = 1000
  }
}

export const sseManager = new SSEManager()
