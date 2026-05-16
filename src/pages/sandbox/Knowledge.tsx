import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/Badge'
import { SbBtn, SbPanel } from './atoms'
import { KG } from './kgData'
import type { KGEdge, KGNode } from './types'

interface Pos { x: number; y: number; vx: number; vy: number }

function useForceSim(nodes: KGNode[], edges: KGEdge[]) {
  const stateRef = useRef<Record<string, Pos> | null>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    const map: Record<string, Pos> = {}
    nodes.forEach((n, i) => {
      const ang = (i / Math.max(1, nodes.length)) * Math.PI * 2
      const r = 200 + (n.type === 'doc' ? 60 : n.type === 'query' ? 280 : n.type === 'entity' ? 180 : 100)
      map[n.id] = {
        x: Math.cos(ang) * r + (Math.random() - 0.5) * 40,
        y: Math.sin(ang) * r + (Math.random() - 0.5) * 40,
        vx: 0, vy: 0,
      }
    })
    stateRef.current = map
    setTick((t) => t + 1)
  }, [nodes, edges])

  useEffect(() => {
    let rafId = 0
    let frames = 0
    const REP = 9000, SPR = 0.03, REST = 90, CENTER = 0.012, DAMP = 0.86
    const step = () => {
      const map = stateRef.current
      if (!map) return
      const ids = Object.keys(map)
      for (let i = 0; i < ids.length; i++) {
        const a = map[ids[i]]
        for (let j = i + 1; j < ids.length; j++) {
          const b = map[ids[j]]
          const dx = a.x - b.x, dy = a.y - b.y
          const d2 = dx * dx + dy * dy + 0.01
          const d = Math.sqrt(d2)
          const f = REP / d2
          const fx = (dx / d) * f, fy = (dy / d) * f
          a.vx += fx; a.vy += fy
          b.vx -= fx; b.vy -= fy
        }
      }
      edges.forEach((e) => {
        const a = map[e.from], b = map[e.to]
        if (!a || !b) return
        const dx = b.x - a.x, dy = b.y - a.y
        const d = Math.sqrt(dx * dx + dy * dy) + 0.01
        const f = (d - REST) * SPR
        const fx = (dx / d) * f, fy = (dy / d) * f
        a.vx += fx; a.vy += fy
        b.vx -= fx; b.vy -= fy
      })
      ids.forEach((id) => {
        const p = map[id]
        p.vx += -p.x * CENTER
        p.vy += -p.y * CENTER
        p.vx *= DAMP; p.vy *= DAMP
        p.x += p.vx; p.y += p.vy
      })
      frames++
      if (frames % 5 === 0) setTick((t) => t + 1)
      if (frames < 400) rafId = requestAnimationFrame(step)
    }
    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [nodes, edges])

  return stateRef.current
}

interface NodeStyle { fill: string; stroke: string; radius: number }

const NODE_STYLE: Record<KGNode['type'], NodeStyle> = {
  doc:    { fill: 'fill-ink-950 dark:fill-white',           stroke: 'stroke-ink-950 dark:stroke-white',  radius: 11 },
  chunk:  { fill: 'fill-white dark:fill-ink-950',           stroke: 'stroke-ink-300 dark:stroke-ink-700', radius: 5 },
  entity: { fill: 'fill-accent-50 dark:fill-accent-700/20', stroke: 'stroke-accent-500',                 radius: 8 },
  query:  { fill: 'fill-amber-50 dark:fill-amber-900/30',   stroke: 'stroke-amber-500',                  radius: 7 },
}

type TypeFilter = Record<KGNode['type'], boolean>

export function KnowledgeGraph() {
  const [filter, setFilter] = useState<TypeFilter>({ doc: true, chunk: true, entity: true, query: true })
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string>('d4')
  const [hover, setHover] = useState<string | null>(null)
  const [pan, setPan] = useState({ x: 0, y: 0, k: 1 })
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null)

  const visibleNodes = useMemo(() => {
    const q = search.trim().toLowerCase()
    return KG.nodes.filter((n) => {
      if (!filter[n.type]) return false
      if (!q) return true
      return n.label.toLowerCase().includes(q) || (n.tag || '').toLowerCase().includes(q)
    })
  }, [filter, search])

  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes])
  const visibleEdges = useMemo(() => KG.edges.filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to)), [visibleIds])

  const pos = useForceSim(visibleNodes, visibleEdges)

  const focusId = hover || selected
  const neighborIds = useMemo(() => {
    const s = new Set<string>([focusId])
    KG.edges.forEach((e) => {
      if (e.from === focusId) s.add(e.to)
      if (e.to === focusId) s.add(e.from)
    })
    return s
  }, [focusId])

  const selectedNode = KG.nodes.find((n) => n.id === selected)
  const selectedEdges = KG.edges.filter((e) => e.from === selected || e.to === selected)

  const onWheel = (e: React.WheelEvent) => {
    const k = Math.max(0.4, Math.min(2.5, pan.k * (e.deltaY < 0 ? 1.1 : 0.9)))
    setPan((p) => ({ ...p, k }))
  }
  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return
    const d = dragRef.current
    setPan((p) => ({ ...p, x: d.px + (e.clientX - d.x), y: d.py + (e.clientY - d.y) }))
  }
  const onMouseUp = () => { dragRef.current = null }

  const VBW = 900, VBH = 620
  const tx = VBW / 2 + pan.x, ty = VBH / 2 + pan.y

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
      <SbPanel
        title="Knowledge graph · payments + runbooks"
        action={<span className="mono text-[10.5px] text-ink-500">{visibleNodes.length} nodes · {visibleEdges.length} edges</span>}
        className="min-h-[560px]"
      >
        <div className="px-3 py-2 border-b hairline flex items-center gap-2 flex-wrap bg-ink-50/40 dark:bg-ink-900/30">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes…"
            className="h-7 px-2.5 rounded-md border hairline bg-white dark:bg-ink-950 text-[12px] mono w-44 focus:outline-none focus:border-ink-950 dark:focus:border-white"
          />
          <div className="flex items-center gap-1">
            {(['doc', 'chunk', 'entity', 'query'] as const).map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => setFilter((f) => ({ ...f, [k]: !f[k] }))}
                className={`mono text-[10.5px] uppercase tracking-wider px-2 h-6 rounded border ${
                  filter[k]
                    ? 'border-ink-950 dark:border-white bg-ink-950 text-white dark:bg-white dark:text-ink-950'
                    : 'hairline text-ink-500 hover:bg-ink-50 dark:hover:bg-ink-900'
                }`}
              >
                {k} {filter[k] ? '·' : '✕'}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setPan({ x: 0, y: 0, k: 1 })}
            className="mono text-[10.5px] uppercase tracking-wider px-2 h-6 rounded border hairline text-ink-500 hover:bg-ink-50 dark:hover:bg-ink-900"
          >
            reset view
          </button>
        </div>
        <div
          className="relative grid-bg h-full"
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          style={{ cursor: dragRef.current ? 'grabbing' : 'grab' }}
        >
          <svg viewBox={`0 0 ${VBW} ${VBH}`} className="w-full h-full block">
            <g transform={`translate(${tx} ${ty}) scale(${pan.k})`}>
              {pos && visibleEdges.map((e, i) => {
                const a = pos[e.from], b = pos[e.to]
                if (!a || !b) return null
                const inFocus = focusId === e.from || focusId === e.to
                const dimmed = focusId && !inFocus
                const stroke =
                  e.kind === 'retrieved' ? 'stroke-amber-400'
                    : e.kind === 'mentions' ? 'stroke-accent-400'
                      : e.kind === 'related' ? 'stroke-ink-400 dark:stroke-ink-500'
                        : 'stroke-ink-300 dark:stroke-ink-700'
                return (
                  <line
                    key={i}
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    className={stroke}
                    strokeWidth={inFocus ? 1.8 : 1}
                    strokeOpacity={dimmed ? 0.18 : inFocus ? 0.9 : 0.55}
                    strokeDasharray={e.kind === 'retrieved' ? '4 3' : undefined}
                  />
                )
              })}
              {pos && visibleNodes.map((n) => {
                const p = pos[n.id]
                if (!p) return null
                const s = NODE_STYLE[n.type]
                const isFocus = n.id === focusId
                const isNeighbor = neighborIds.has(n.id)
                const dimmed = focusId && !isNeighbor
                const r = isFocus ? s.radius + 3 : s.radius
                return (
                  <g
                    key={n.id}
                    transform={`translate(${p.x} ${p.y})`}
                    style={{ cursor: 'pointer', opacity: dimmed ? 0.25 : 1, transition: 'opacity .15s' }}
                    onMouseEnter={() => setHover(n.id)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setSelected(n.id)}
                  >
                    {isFocus && (
                      <circle r={r + 6} fill="none" className="stroke-accent-500" strokeWidth={1.2} strokeDasharray="3 2" />
                    )}
                    <circle r={r} className={`${s.fill} ${s.stroke}`} strokeWidth={isFocus ? 1.8 : 1.2} />
                    {(isFocus || n.type === 'doc' || n.type === 'query' || pan.k > 1.3) && (
                      <text
                        x={r + 4}
                        y={3}
                        className={`mono ${n.type === 'doc' ? 'fill-ink-950 dark:fill-white' : 'fill-ink-600 dark:fill-ink-400'}`}
                        fontSize={n.type === 'doc' ? 11 : 9.5}
                        style={{ paintOrder: 'stroke', stroke: 'rgba(255,255,255,0.7)', strokeWidth: 3 }}
                      >
                        {n.label}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          </svg>
          <div className="absolute left-3 bottom-3 flex items-center gap-3 px-3 py-2 rounded-lg border hairline bg-white/85 dark:bg-ink-950/85 backdrop-blur mono text-[10px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-ink-950 dark:bg-white" />doc</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full border border-ink-300 dark:border-ink-700" />chunk</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent-50 border border-accent-500 dark:bg-accent-700/20" />entity</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-50 border border-amber-500 dark:bg-amber-900/30" />query</span>
          </div>
          <div className="absolute right-3 bottom-3 mono text-[10px] uppercase tracking-wider text-ink-500">
            scroll · zoom · drag · pan · zoom {Math.round(pan.k * 100)}%
          </div>
        </div>
      </SbPanel>

      <div className="flex flex-col gap-4 min-h-0">
        <SbPanel title="Memory stats">
          <div className="px-4 py-3 grid grid-cols-2 gap-2.5 text-[12px]">
            {([
              ['Nodes', KG.stats.nodes], ['Edges', KG.stats.edges],
              ['Docs', KG.stats.docs], ['Chunks', KG.stats.chunks],
              ['Entities', KG.stats.entities], ['Queries', KG.stats.queries],
              ['Dim', KG.stats.dims], ['Index', KG.stats.bytes],
            ] as const).map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between px-2 py-1.5 rounded-md bg-ink-50/60 dark:bg-ink-900/40">
                <span className="mono text-[10px] uppercase tracking-wider text-ink-500">{k}</span>
                <span className="mono text-[12px] text-ink-950 dark:text-white tabular-nums">{v}</span>
              </div>
            ))}
          </div>
        </SbPanel>

        <SbPanel
          title={`Selected · ${selectedNode?.type || ''}`}
          action={<SbBtn variant="ghost" size="xs" icon="arrow-right">open</SbBtn>}
          className="flex-1"
        >
          {selectedNode ? (
            <div className="px-4 py-3 space-y-3 text-[12.5px]">
              <div>
                <div className="mono text-[10px] uppercase tracking-wider text-ink-500 mb-1">id</div>
                <div className="mono text-ink-700 dark:text-ink-300">{selectedNode.id}</div>
              </div>
              <div>
                <div className="mono text-[10px] uppercase tracking-wider text-ink-500 mb-1">label</div>
                <div className="text-ink-950 dark:text-white font-medium">{selectedNode.label}</div>
              </div>
              {selectedNode.tag && (
                <div>
                  <div className="mono text-[10px] uppercase tracking-wider text-ink-500 mb-1">tag</div>
                  <Badge tone="neutral">{selectedNode.tag}</Badge>
                </div>
              )}
              {selectedNode.meta && (
                <div>
                  <div className="mono text-[10px] uppercase tracking-wider text-ink-500 mb-1">meta</div>
                  <div className="text-ink-700 dark:text-ink-300">{selectedNode.meta}</div>
                </div>
              )}
              <div>
                <div className="mono text-[10px] uppercase tracking-wider text-ink-500 mb-1.5">edges · {selectedEdges.length}</div>
                <div className="space-y-1 max-h-[200px] overflow-auto scroll-thin pr-1">
                  {selectedEdges.length === 0 ? (
                    <div className="text-ink-500 italic">no edges</div>
                  ) : (
                    selectedEdges.map((e, i) => {
                      const otherId = e.from === selected ? e.to : e.from
                      const other = KG.nodes.find((n) => n.id === otherId)
                      const direction = e.from === selected ? '→' : '←'
                      const tone = e.kind === 'retrieved' ? 'warn' : e.kind === 'mentions' ? 'accent' : 'neutral'
                      return (
                        <button
                          type="button"
                          key={i}
                          onClick={() => setSelected(otherId)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-ink-50 dark:hover:bg-ink-900 text-left"
                        >
                          <Badge tone={tone}>{e.kind}</Badge>
                          <span className="text-ink-500">{direction}</span>
                          <span className="mono text-[11.5px] text-ink-950 dark:text-white truncate flex-1">{other?.label || otherId}</span>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-ink-500 text-[12px]">Click any node to inspect.</div>
          )}
        </SbPanel>
      </div>
    </div>
  )
}
