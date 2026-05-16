import { useEffect, useMemo, useState } from 'react'
import { SbBtn, SbPanel, SbStatusDot } from './atoms'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface Endpoint { m: Method; p: string; desc: string; body: string | null }
interface Group { group: string; endpoints: Endpoint[] }

const API_GROUPS: Group[] = [
  { group: 'Traces', endpoints: [
    { m: 'GET',    p: '/tracegraph/traces',                         desc: 'List recent executions, paginated.',                    body: null },
    { m: 'GET',    p: '/tracegraph/traces/{executionId}',           desc: 'Fetch a full ExecutionTrace document including steps.', body: null },
    { m: 'GET',    p: '/tracegraph/traces/{executionId}/steps/{i}', desc: 'Fetch a single step and its before/after state.',       body: null },
    { m: 'DELETE', p: '/tracegraph/traces/{executionId}',           desc: 'Delete a stored execution. Lineage links preserved.',   body: null },
  ] },
  { group: 'Replay', endpoints: [
    { m: 'POST', p: '/tracegraph/traces/{executionId}/replay',          desc: 'Re-run a saved trace against the current graph.', body: '{ "overrides": {} }' },
    { m: 'POST', p: '/tracegraph/traces/{executionId}/replay?step={n}', desc: 'Fork: re-run from step n.',                       body: '{ "overrides": {} }' },
    { m: 'GET',  p: '/tracegraph/traces/{a}/diff/{b}',                  desc: 'Diff two executions by id.',                      body: null },
  ] },
  { group: 'Stream', endpoints: [
    { m: 'GET', p: '/tracegraph/traces/stream',                desc: 'SSE: live stream of node enter/exit events.', body: null },
    { m: 'GET', p: '/tracegraph/traces/stream?execution={id}', desc: 'SSE filtered to a single execution.',         body: null },
  ] },
  { group: 'Graph', endpoints: [
    { m: 'GET', p: '/tracegraph/ui/graph',      desc: 'Mermaid source for the registered Graph<?> bean.',      body: null },
    { m: 'GET', p: '/tracegraph/ui/complexity', desc: 'Structural complexity stats for the registered graph.', body: null },
  ] },
]

type MockResponse = unknown

function mockResponse(method: Method, path: string): MockResponse {
  if (path === '/tracegraph/traces') return {
    page: 0, size: 20, total: 4,
    items: [
      { executionId: 'e9c4f1a2', graph: 'order-pipeline', status: 'COMPLETED',   duration: 'PT1.041S', startedAt: '2026-05-06T10:42:18.221Z' },
      { executionId: '3a82d019', graph: 'order-pipeline', status: 'COMPLETED',   duration: 'PT0.994S', startedAt: '2026-05-06T10:31:02.118Z' },
      { executionId: '7f1d92cb', graph: 'rag-agent',      status: 'COMPLETED',   duration: 'PT1.038S', startedAt: '2026-05-06T09:42:18.001Z' },
      { executionId: 'b40e87aa', graph: 'react-agent',    status: 'INTERRUPTED', duration: 'PT0.540S', startedAt: '2026-05-06T07:18:11.882Z' },
    ],
  }
  if (/^\/tracegraph\/traces\/[^/]+$/.test(path)) return {
    executionId: path.split('/').pop(),
    graph: 'order-pipeline', status: 'COMPLETED',
    startedAt: '2026-05-06T10:42:18.221Z', completedAt: '2026-05-06T10:42:19.262Z',
    initialState: { id: 'o-91', valid: false, charged: false, shipped: false },
    finalState: { id: 'o-91', valid: true, charged: true, shipped: true },
    steps: [
      { index: 0, nodeName: 'validate', attempts: 1, duration: 'PT0.012S' },
      { index: 1, nodeName: 'enrich',   attempts: 1, duration: 'PT0.184S', children: ['profile', 'fraud', 'inventory'] },
      { index: 2, nodeName: 'score',    attempts: 1, duration: 'PT0.312S' },
      { index: 3, nodeName: 'charge',   attempts: 2, duration: 'PT0.421S' },
      { index: 4, nodeName: 'ship',     attempts: 1, duration: 'PT0.092S' },
    ],
    forkedFromExecutionId: null, forkedFromStepIndex: null,
  }
  if (/\/steps\/\d+$/.test(path)) return {
    index: 3, nodeName: 'charge', attempts: 2, duration: 'PT0.421S',
    before: { id: 'o-91', charged: false, attempts: 0 },
    after:  { id: 'o-91', charged: true,  attempts: 2 },
    events: [
      { t: 514, level: 'info', msg: 'charge attempt 1/3' },
      { t: 717, level: 'warn', msg: 'charge attempt 1 failed · NetworkTimeoutException' },
      { t: 919, level: 'info', msg: 'charge attempt 2 succeeded · 218ms' },
    ],
  }
  if (path.includes('/replay')) {
    const forked = path.includes('step=')
    return {
      executionId: Math.random().toString(16).slice(2, 10),
      forkedFromExecutionId: path.match(/traces\/([^/]+)/)?.[1],
      forkedFromStepIndex: forked ? parseInt(path.split('step=')[1], 10) : null,
      status: 'COMPLETED', graph: 'order-pipeline', duration: 'PT0.864S',
    }
  }
  if (path.includes('/diff/')) return {
    identical: false, divergenceIndex: 3,
    aOnlySteps: [4], bOnlySteps: [4],
    stateDiff: { attempts: [2, 1], charged: [true, true] },
  }
  if (path.includes('/stream')) return '__SSE__'
  if (path === '/tracegraph/ui/graph') return '__MERMAID__'
  if (path === '/tracegraph/ui/complexity') return {
    cyclomatic: 4, depth: 4, breadth: 3,
    nodes: 5, edges: 5, parallelBranches: 3,
    avgFanOut: 1.0, terminals: 1,
  }
  if (method === 'DELETE') return null
  return { ok: true }
}

interface SseFrame { t: number; type: string; data: Record<string, unknown> }

const SSE_FRAMES: SseFrame[] = [
  { t: 0,    type: 'execution.start',  data: { executionId: 'e9c4f1a2', graph: 'order-pipeline' } },
  { t: 14,   type: 'node.enter',       data: { node: 'validate' } },
  { t: 26,   type: 'node.exit',        data: { node: 'validate', durationMs: 12, status: 'ok' } },
  { t: 28,   type: 'node.enter',       data: { node: 'enrich', branches: 3 } },
  { t: 212,  type: 'node.exit',        data: { node: 'enrich', durationMs: 184, status: 'ok' } },
  { t: 214,  type: 'node.enter',       data: { node: 'score' } },
  { t: 526,  type: 'node.exit',        data: { node: 'score', durationMs: 312, tokens: { p: 482, c: 96 } } },
  { t: 528,  type: 'node.enter',       data: { node: 'charge', attempt: 1 } },
  { t: 731,  type: 'node.retry',       data: { node: 'charge', attempt: 1, error: 'NetworkTimeoutException' } },
  { t: 931,  type: 'node.exit',        data: { node: 'charge', durationMs: 421, attempts: 2, status: 'ok' } },
  { t: 933,  type: 'node.enter',       data: { node: 'ship' } },
  { t: 1025, type: 'node.exit',        data: { node: 'ship', durationMs: 92, status: 'ok' } },
  { t: 1041, type: 'execution.finish', data: { status: 'COMPLETED' } },
]

function PrettyJson({ value }: { value: MockResponse }) {
  if (value === null) return <span className="mono text-[12px] text-ink-500">null · 204 No Content</span>
  if (value === '__MERMAID__') {
    return (
      <pre className="mono text-[12.5px] leading-relaxed text-ink-700 dark:text-ink-300 whitespace-pre">
{`graph TD
  validate --> enrich
  validate --> score
  enrich   --> charge
  score    --> charge
  charge   --> ship`}
      </pre>
    )
  }
  const json = JSON.stringify(value, null, 2)
  const html = json
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/"([^"]+)":/g, '<span class="nm">"$1"</span>:')
    .replace(/: ("[^"]*")/g, ': <span class="st">$1</span>')
    .replace(/: (true|false|null)/g, ': <span class="kw">$1</span>')
    .replace(/: (-?\d+\.?\d*)/g, ': <span class="ty">$1</span>')
  return <pre className="code-block text-ink-800 dark:text-ink-100 whitespace-pre" dangerouslySetInnerHTML={{ __html: html }} />
}

const methodTones: Record<Method, string> = {
  GET: 'bg-emerald-500 text-white',
  POST: 'bg-accent-500 text-white',
  DELETE: 'bg-rose-500 text-white',
  PUT: 'bg-amber-500 text-white',
}

export function ApiConsole() {
  const flat = useMemo(() => API_GROUPS.flatMap((g) => g.endpoints.map((e) => ({ ...e, group: g.group }))), [])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const ep = flat[selectedIdx]

  const params = useMemo(() => {
    const m = ep.p.match(/\{[^}]+\}/g) || []
    return m.map((s) => s.slice(1, -1))
  }, [ep.p])

  const [paramVals, setParamVals] = useState<Record<string, string>>({})
  useEffect(() => {
    const def: Record<string, string> = {}
    params.forEach((p) => {
      def[p] = p.toLowerCase().includes('id') || p === 'a' || p === 'b'
        ? 'e9c4f1a2-8b40-4e15-9c2d-0a4e7d6b5e21'
        : '3'
    })
    setParamVals(def)
  }, [ep.p, params])

  const [body, setBody] = useState(ep.body || '')
  useEffect(() => setBody(ep.body || ''), [ep.p, ep.body])

  const [response, setResponse] = useState<MockResponse | '__SSE_STREAMING__' | null>(null)
  const [latency, setLatency] = useState<number | null>(null)
  const [sending, setSending] = useState(false)

  const [sseEvents, setSseEvents] = useState<SseFrame[]>([])
  const [sseOn, setSseOn] = useState(false)
  useEffect(() => {
    if (!sseOn) return
    setSseEvents([])
    let i = 0
    const id = setInterval(() => {
      if (i >= SSE_FRAMES.length) { setSseOn(false); clearInterval(id); return }
      setSseEvents((prev) => [...prev, SSE_FRAMES[i++]])
    }, 220)
    return () => clearInterval(id)
  }, [sseOn])

  const resolvedPath = useMemo(() => {
    let s = ep.p
    params.forEach((p) => { s = s.replace(`{${p}}`, paramVals[p] || `{${p}}`) })
    return s
  }, [ep.p, paramVals, params])

  const send = () => {
    if (resolvedPath.includes('/stream')) {
      setSseOn(true)
      setResponse('__SSE_STREAMING__')
      setLatency(0)
      return
    }
    setSending(true)
    setResponse(null)
    setTimeout(() => {
      setResponse(mockResponse(ep.m, resolvedPath))
      setLatency(120 + Math.round(Math.random() * 90))
      setSending(false)
    }, 180)
  }

  const methodTone = methodTones[ep.m]

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
      <SbPanel title={`REST API · ${flat.length} endpoints`}>
        <div className="px-2 py-2 space-y-3">
          {API_GROUPS.map((g) => (
            <div key={g.group}>
              <div className="mono text-[10px] uppercase tracking-wider text-ink-500 px-2 py-1">{g.group}</div>
              <div className="space-y-0.5">
                {g.endpoints.map((e, ei) => {
                  const idx = flat.findIndex((x) => x.p === e.p && x.m === e.m)
                  const active = selectedIdx === idx
                  return (
                    <button
                      type="button"
                      key={ei}
                      onClick={() => setSelectedIdx(idx)}
                      className={`w-full text-left px-2 py-1.5 rounded-md flex items-start gap-2 ${
                        active ? 'bg-ink-950 text-white dark:bg-white dark:text-ink-950' : 'hover:bg-ink-50 dark:hover:bg-ink-900'
                      }`}
                    >
                      <span className={`mono text-[9.5px] uppercase font-medium w-12 h-[18px] inline-flex items-center justify-center rounded ${
                        active ? 'bg-white/15 dark:bg-ink-950/20' : methodTones[e.m]
                      }`}>{e.m}</span>
                      <span className={`mono text-[11px] leading-tight break-all ${active ? '' : 'text-ink-700 dark:text-ink-300'}`}>
                        {e.p.replace('/tracegraph', '')}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </SbPanel>

      <div className="flex flex-col gap-4 min-h-0">
        <SbPanel title="Request">
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-stretch gap-2">
              <span className={`mono text-[10.5px] uppercase tracking-wider px-2.5 inline-flex items-center rounded ${methodTone}`}>{ep.m}</span>
              <code className="mono text-[12.5px] flex-1 px-3 h-8 inline-flex items-center rounded-md border hairline bg-ink-50/60 dark:bg-ink-900/40 text-ink-950 dark:text-white truncate">
                {resolvedPath}
              </code>
              <SbBtn variant="primary" size="sm" icon={resolvedPath.includes('/stream') ? 'zap' : 'arrow-right'} onClick={send}>
                {resolvedPath.includes('/stream') ? (sseOn ? 'Streaming…' : 'Connect SSE') : sending ? 'Sending…' : 'Send'}
              </SbBtn>
            </div>
            <p className="text-[12px] text-ink-600 dark:text-ink-400">{ep.desc}</p>

            {params.length > 0 && (
              <div>
                <div className="mono text-[10px] uppercase tracking-wider text-ink-500 mb-1.5">path params</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {params.map((p) => (
                    <label key={p} className="flex flex-col gap-1">
                      <span className="mono text-[10.5px] text-ink-500">{p}</span>
                      <input
                        value={paramVals[p] || ''}
                        onChange={(e) => setParamVals((v) => ({ ...v, [p]: e.target.value }))}
                        className="mono text-[12px] h-8 px-2.5 rounded-md border hairline bg-white dark:bg-ink-950 focus:outline-none focus:border-ink-950 dark:focus:border-white"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {ep.m === 'POST' && (
              <div>
                <div className="mono text-[10px] uppercase tracking-wider text-ink-500 mb-1.5">body · application/json</div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  className="w-full mono text-[12px] px-2.5 py-2 rounded-md border hairline bg-white dark:bg-ink-950 focus:outline-none focus:border-ink-950 dark:focus:border-white"
                />
              </div>
            )}
          </div>
        </SbPanel>

        <SbPanel
          title="Response"
          action={
            <div className="flex items-center gap-2 mono text-[10.5px] text-ink-500">
              {response && response !== '__SSE_STREAMING__' && (
                <>
                  <span className="text-emerald-600 dark:text-emerald-400">200 OK</span>
                  <span>·</span><span>{latency}ms</span><span>·</span><span>application/json</span>
                </>
              )}
              {response === '__SSE_STREAMING__' && (
                <span className="flex items-center gap-1.5 text-accent-700 dark:text-accent-100">
                  <SbStatusDot tone="accent" pulse /> text/event-stream · {sseEvents.length} events
                </span>
              )}
            </div>
          }
          className="flex-1"
        >
          <div className="px-4 py-3 h-full overflow-auto scroll-thin">
            {!response ? (
              <div className="text-[12px] text-ink-500 italic">Press Send to invoke the mock endpoint.</div>
            ) : response === '__SSE_STREAMING__' ? (
              <div className="space-y-2">
                {sseEvents.length === 0 ? (
                  <div className="mono text-[12px] text-ink-500">connecting…</div>
                ) : sseEvents.map((e, i) => (
                  <div key={i} className="mono text-[12px] flex items-start gap-3">
                    <span className="text-ink-500 w-12 tabular-nums">{String(e.t).padStart(4, ' ')}ms</span>
                    <span className={`uppercase tracking-wider w-32 ${
                      e.type.startsWith('execution') ? 'text-accent-700 dark:text-accent-100'
                        : e.type.includes('retry') ? 'text-amber-600 dark:text-amber-300'
                          : 'text-ink-600 dark:text-ink-400'
                    }`}>event: {e.type.split('.')[1]}</span>
                    <span className="text-ink-700 dark:text-ink-300 flex-1 break-all">data: {JSON.stringify(e.data)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <PrettyJson value={response} />
            )}
          </div>
        </SbPanel>
      </div>
    </div>
  )
}
