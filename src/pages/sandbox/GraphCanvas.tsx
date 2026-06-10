import { SbStatusDot } from './atoms'
import type { HistoryEntry, Preset, PresetNode, RunStatus } from './types'

interface NodeState {
  phase: 'idle' | 'running' | 'done' | 'failed'
  attempt?: number
  willFail?: boolean
}

function edgePts(a: PresetNode, b: PresetNode) {
  return { ax: a.x + a.w / 2, ay: a.y + a.h, bx: b.x + b.w / 2, by: b.y }
}

interface Props {
  preset: Preset
  history: HistoryEntry[]
  currentStep: number
  runStatus: RunStatus
  failingNodes: Set<string>
  onPickNode: (id: string) => void
  selectedNode: string | null
}

export function GraphCanvas({ preset, history, currentStep, runStatus, failingNodes, onPickNode, selectedNode }: Props) {
  const { nodes, edges } = preset

  const nodeState: Record<string, NodeState> = {}
  nodes.forEach((n) => {
    if (n.kind === 'terminal') { nodeState[n.id] = { phase: 'idle' }; return }
    const hist = history.filter((h) => h.node === n.id)
    if (hist.length === 0) { nodeState[n.id] = { phase: 'idle' }; return }
    const last = hist[hist.length - 1]
    nodeState[n.id] = {
      phase: last.running ? 'running' : last.failed ? 'failed' : 'done',
      attempt: last.attempt,
      willFail: failingNodes.has(n.id) && runStatus === 'running',
    }
  })
  nodes.filter((n) => n.kind === 'terminal').forEach((t) => {
    const hasIncoming = edges.some((e) => e.to === t.id && history.some((h) => h.node === e.from && !h.running))
    const hasOutgoing = edges.some((e) => e.from === t.id) && history.length > 0
    nodeState[t.id] = { phase: (hasIncoming || hasOutgoing) ? 'done' : 'idle' }
  })

  const running = nodes.find((n) => nodeState[n.id]?.phase === 'running')
  const activeEdges = new Set<string>()
  if (running) {
    edges.forEach((e) => {
      if (e.to === running.id && nodeState[e.from]?.phase === 'done') {
        activeEdges.add(`${e.from}->${e.to}`)
      }
    })
  }
  const doneEdges = new Set<string>()
  edges.forEach((e) => {
    if (nodeState[e.from]?.phase === 'done' && nodeState[e.to]?.phase === 'done') {
      doneEdges.add(`${e.from}->${e.to}`)
    }
  })

  return (
    <div className="relative h-full grid-bg overflow-hidden">
      <svg viewBox="0 0 720 600" className="w-full h-full" aria-label="Interactive execution graph">
        <title>Interactive execution graph</title>
        <defs>
          <marker id="sb-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" className="fill-ink-400 dark:fill-ink-500" />
          </marker>
          <marker id="sb-arr-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#0d8f63" />
          </marker>
          <marker id="sb-arr-done" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" className="fill-ink-700 dark:fill-ink-300" />
          </marker>
        </defs>

        {edges.map((e, i) => {
          const a = nodes.find((n) => n.id === e.from)
          const b = nodes.find((n) => n.id === e.to)
          if (!a || !b) return null
          const { ax, ay, bx, by } = edgePts(a, b)
          const k = `${e.from}->${e.to}`
          const isActive = activeEdges.has(k)
          const isDone = doneEdges.has(k)
          const mid = { x: (ax + bx) / 2, y: (ay + by) / 2 }
          const cls = isActive ? 'stroke-accent-500 edge-flow' : isDone ? 'stroke-ink-700 dark:stroke-ink-300' : 'stroke-ink-300 dark:stroke-ink-700'
          const marker = isActive ? 'url(#sb-arr-on)' : isDone ? 'url(#sb-arr-done)' : 'url(#sb-arr)'
          const dx = bx - ax, dy = by - ay
          const cx = ax + dx * 0.5, cy = ay + dy * 0.5
          return (
            <g key={i}>
              <path
                d={`M ${ax} ${ay} Q ${cx} ${cy + 8} ${bx} ${by - 4}`}
                fill="none"
                strokeWidth={isActive ? 2 : 1.4}
                className={cls}
                markerEnd={marker}
              />
              {e.label && (
                <g>
                  <rect
                    x={mid.x - (e.label.length * 3.6 + 8)}
                    y={mid.y - 9}
                    width={e.label.length * 3.6 * 2 + 16}
                    height={16}
                    rx={4}
                    className={isActive ? 'fill-white dark:fill-ink-950 stroke-accent-500' : 'fill-white dark:fill-ink-950 stroke-ink-200 dark:stroke-ink-800'}
                    strokeWidth={1}
                  />
                  <text
                    x={mid.x}
                    y={mid.y + 3}
                    textAnchor="middle"
                    className={`mono ${isActive ? 'fill-accent-600 dark:fill-accent-100' : 'fill-ink-500'}`}
                    fontSize="9.5"
                  >
                    {e.label}
                  </text>
                </g>
              )}
            </g>
          )
        })}

        {nodes.map((n) => {
          const st = nodeState[n.id]
          const isTerminal = n.kind === 'terminal'
          const isSelected = selectedNode === n.id
          const ringCls =
            st.phase === 'running' ? 'stroke-accent-500' :
            st.phase === 'failed' ? 'stroke-rose-500' :
            st.phase === 'done' ? 'stroke-ink-950 dark:stroke-white' :
            'stroke-ink-300 dark:stroke-ink-700'
          const fillCls = isTerminal
            ? (st.phase === 'done' ? 'fill-ink-950 dark:fill-white' : 'fill-white dark:fill-ink-950')
            : st.phase === 'running' ? 'fill-accent-50 dark:fill-accent-700/15'
              : st.phase === 'failed' ? 'fill-rose-50 dark:fill-rose-900/15'
              : 'fill-white dark:fill-ink-950'
          const textCls = isTerminal && st.phase === 'done' ? 'fill-white dark:fill-ink-950' : 'fill-ink-950 dark:fill-white'

          const isClickable = !isTerminal
          return (
            <g
              key={n.id}
              className={`focus-visible:outline-none [&_rect]:focus-visible:stroke-accent-500 [&_rect]:focus-visible:stroke-[2.5px] ${isClickable ? 'cursor-pointer' : 'cursor-default'} ${st.phase === 'running' ? 'node-running' : ''}`}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              aria-label={`Node: ${n.label}${n.sub ? `, ${n.sub}` : ''}`}
              onClick={() => isClickable && onPickNode(n.id)}
              onKeyDown={(e) => {
                if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  onPickNode(n.id)
                }
              }}
              style={{ outline: 'none' }}
            >
              {isSelected && !isTerminal && (
                <rect
                  x={n.x - 5} y={n.y - 5}
                  width={n.w + 10} height={n.h + 10}
                  rx={12}
                  fill="none"
                  className="stroke-ink-950 dark:stroke-white"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              )}
              <rect
                x={n.x} y={n.y}
                width={n.w} height={n.h}
                rx={isTerminal ? 6 : 10}
                className={`${fillCls} ${ringCls}`}
                strokeWidth={st.phase === 'running' ? 1.8 : 1.4}
              />
              <text
                x={n.x + n.w / 2}
                y={n.y + (n.sub ? 22 : n.h / 2 + 4)}
                textAnchor="middle"
                className={`mono font-medium ${textCls}`}
                fontSize={isTerminal ? 10 : 12}
              >
                {n.label}
              </text>
              {n.sub && (
                <text
                  x={n.x + n.w / 2}
                  y={n.y + 38}
                  textAnchor="middle"
                  className={`mono ${
                    st.phase === 'running' ? 'fill-accent-600 dark:fill-accent-100'
                    : st.phase === 'failed' ? 'fill-rose-600 dark:fill-rose-400'
                    : 'fill-ink-500'
                  }`}
                  fontSize="9.5"
                >
                  {n.sub}
                </text>
              )}
              {st.phase === 'running' && !isTerminal && (
                <circle cx={n.x + n.w - 10} cy={n.y + 10} r={3.5} fill="#0d8f63" />
              )}
              {st.phase === 'failed' && !isTerminal && (
                <circle cx={n.x + n.w - 10} cy={n.y + 10} r={3.5} fill="#f43f5e" />
              )}
              {st.willFail && st.phase === 'running' && (
                <text x={n.x + n.w - 22} y={n.y + 14} textAnchor="end" className="mono fill-rose-500" fontSize="8.5">fail</text>
              )}
              {(st.attempt ?? 0) > 1 && (
                <text x={n.x + 8} y={n.y + n.h - 6} className="mono fill-amber-600 dark:fill-amber-400" fontSize="9">
                  ↻ attempt {st.attempt}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <div className="absolute left-3 bottom-3 flex items-center gap-3 px-3 py-2 rounded-lg border hairline bg-white/80 dark:bg-ink-950/80 backdrop-blur mono text-[10px] uppercase tracking-wider text-ink-500">
        <span className="flex items-center gap-1.5"><SbStatusDot tone="accent" /> running</span>
        <span className="flex items-center gap-1.5"><SbStatusDot tone="ok" /> done</span>
        <span className="flex items-center gap-1.5"><SbStatusDot tone="err" /> failed</span>
        <span className="flex items-center gap-1.5"><SbStatusDot tone="neutral" /> idle</span>
      </div>

      {runStatus !== 'idle' && (
        <div className="absolute right-3 top-3 px-2.5 py-1.5 rounded-md border hairline bg-white/80 dark:bg-ink-950/80 backdrop-blur flex items-center gap-2 mono text-[10.5px] uppercase tracking-wider">
          <SbStatusDot tone={runStatus === 'running' ? 'accent' : runStatus === 'failed' ? 'err' : 'ok'} pulse={runStatus === 'running'} />
          <span className="text-ink-700 dark:text-ink-300">
            exec · {runStatus === 'running' ? `step ${currentStep + 1}/${preset.steps.length}` : runStatus}
          </span>
        </div>
      )}
    </div>
  )
}
