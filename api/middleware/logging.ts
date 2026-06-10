import type { Context, Next } from 'hono'

declare module 'hono' {
  interface ContextVariableMap {
    requestId: string
    upstreamStatus: number | null
  }
}

export async function loggingMiddleware(c: Context, next: Next) {
  const reqId = c.req.header('x-request-id') || crypto.randomUUID()
  c.set('requestId', reqId)
  c.header('x-request-id', reqId)
  c.set('upstreamStatus', null)

  const startTime = Date.now()

  await next()

  const latency = Date.now() - startTime
  const status = c.res.status
  const path = c.req.path
  const method = c.req.method
  const upstreamStatus = c.get('upstreamStatus')

  const logPayload = {
    type: 'request',
    requestId: reqId,
    method,
    path,
    status,
    latencyMs: latency,
    upstreamStatus,
    timestamp: new Date().toISOString(),
  }

  console.log(JSON.stringify(logPayload))

  // Emit basic metrics
  const metricPayload = {
    type: 'metric',
    name: 'http_request',
    requestId: reqId,
    method,
    path,
    status,
    latencyMs: latency,
    upstreamStatus,
    timestamp: new Date().toISOString(),
  }
  console.log(JSON.stringify(metricPayload))
}
