import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/Badge'
import { SbBtn, SbIcon, SbPanel } from './sandbox/atoms'
import { ApiConsole } from './sandbox/ApiConsole'
import { SandboxHeader, MetricTile, TransportBar } from './sandbox/Chrome'
import { PRESETS, RUNS_SEED, SOURCE } from './sandbox/data'
import { GraphCanvas } from './sandbox/GraphCanvas'
import { CodeView, DiffView, LineageView, LogStream, StateView, StepTimeline } from './sandbox/Inspector'
import { KnowledgeGraph } from './sandbox/Knowledge'
import { Waterfall } from './sandbox/Waterfall'
import type { HistoryEntry, LogEvent, Preset, RunRecord, RunStatus } from './sandbox/types'
import type { IconName } from './sandbox/atoms'

type ViewKey = 'execution' | 'knowledge' | 'waterfall' | 'api'
type LeftTab = 'presets' | 'source' | 'inject'
type RightTab = 'diff' | 'state' | 'steps' | 'lineage'

interface SandboxView { id: ViewKey; label: string; icon: IconName; desc: string }

const SANDBOX_VIEWS: SandboxView[] = [
  { id: 'execution', label: 'Execution',       icon: 'zap',           desc: 'Run, replay, fork, diff' },
  { id: 'knowledge', label: 'Knowledge graph', icon: 'layers',        desc: 'Explore the agent’s memory' },
  { id: 'waterfall', label: 'Waterfall',       icon: 'chevron-right', desc: 'Span gantt with retries' },
  { id: 'api',       label: 'API console',     icon: 'code',          desc: 'REST playground + live SSE' },
]

interface TimelineEvent { at: number; kind: 'start' | 'retry' | 'end'; stepIndex: number; attempt: number }

function buildTimeline(preset: Preset, failingNodes: Set<string>) {
  let t = 0
  const events: TimelineEvent[] = []
  preset.steps.forEach((step, i) => {
    const wantsFail = failingNodes.has(step.node)
    const attempts = wantsFail ? 2 : step.attempts || 1
    let cursor = t
    for (let a = 1; a <= attempts; a++) {
      const isLast = a === attempts
      const attemptDur = attempts === 1 ? step.dur : Math.round(step.dur / attempts)
      events.push({ at: cursor, kind: 'start', stepIndex: i, attempt: a })
      cursor += attemptDur
      if (!isLast) { events.push({ at: cursor, kind: 'retry', stepIndex: i, attempt: a }); cursor += 180 }
      else events.push({ at: cursor, kind: 'end', stepIndex: i, attempt: a })
    }
    t = cursor
  })
  return { events, totalDuration: t }
}

function CoachCard({ runStatus, hasFork, failingCount }: { runStatus: RunStatus; hasFork: boolean; failingCount: number }) {
  let body: React.ReactNode
  if (runStatus === 'idle') {
    body = (
      <>
        <div className="mono text-[10px] uppercase tracking-wider text-accent-600 dark:text-accent-100 mb-1">Tip 01</div>
        <div className="text-[13px] text-ink-950 dark:text-white font-medium mb-1">Hit Run to start the execution.</div>
        <div className="text-[12px] text-ink-600 dark:text-ink-400">Nodes light up as they execute. Click any step in the timeline to jump.</div>
      </>
    )
  } else if (runStatus === 'running') {
    body = (
      <>
        <div className="mono text-[10px] uppercase tracking-wider text-accent-600 dark:text-accent-100 mb-1">Tip 02</div>
        <div className="text-[13px] text-ink-950 dark:text-white font-medium mb-1">Try the scrubber.</div>
        <div className="text-[12px] text-ink-600 dark:text-ink-400">Click anywhere on the transport bar to time-travel. Press <span className="mono px-1 rounded bg-ink-100 dark:bg-ink-900">Space</span> to pause.</div>
      </>
    )
  } else if (runStatus === 'completed' && !hasFork) {
    body = (
      <>
        <div className="mono text-[10px] uppercase tracking-wider text-accent-600 dark:text-accent-100 mb-1">Tip 03</div>
        <div className="text-[13px] text-ink-950 dark:text-white font-medium mb-1">Fork from any step.</div>
        <div className="text-[12px] text-ink-600 dark:text-ink-400">Click a step, then <span className="mono">Fork</span> to create a branched run rooted at that checkpoint. See the lineage tab.</div>
      </>
    )
  } else if (failingCount === 0) {
    body = (
      <>
        <div className="mono text-[10px] uppercase tracking-wider text-accent-600 dark:text-accent-100 mb-1">Tip 04</div>
        <div className="text-[13px] text-ink-950 dark:text-white font-medium mb-1">Inject a failure.</div>
        <div className="text-[12px] text-ink-600 dark:text-ink-400">Open the Inject tab on the left. Pick any node — the next run will fail it, then retry with exponential backoff.</div>
      </>
    )
  } else {
    body = (
      <>
        <div className="mono text-[10px] uppercase tracking-wider text-accent-600 dark:text-accent-100 mb-1">Tip 05</div>
        <div className="text-[13px] text-ink-950 dark:text-white font-medium mb-1">Diff two runs.</div>
        <div className="text-[12px] text-ink-600 dark:text-ink-400">In a real deployment you'd compare runs side-by-side; the trace explorer page handles that view in full.</div>
      </>
    )
  }
  return <div className="rounded-xl border hairline bg-accent-50 dark:bg-accent-700/15 p-3.5">{body}</div>
}

export function Sandbox() {
  const [presetKey, setPresetKey] = useState<string>('order-pipeline')
  const [view, setView] = useState<ViewKey>('execution')
  const [leftTab, setLeftTab] = useState<LeftTab>('presets')
  const [rightTab, setRightTab] = useState<RightTab>('diff')
  const [speed, setSpeed] = useState(1)

  const preset = PRESETS[presetKey]

  const [runStatus, setRunStatus] = useState<RunStatus>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [events, setEvents] = useState<LogEvent[]>([])
  const [currentStep, setCurrentStep] = useState(-1)
  const [selectedStep, setSelectedStep] = useState(0)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [failingNodes, setFailingNodes] = useState<Set<string>>(new Set())
  const [runs, setRuns] = useState<RunRecord[]>(RUNS_SEED)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)

  const timeline = useMemo(() => buildTimeline(preset, failingNodes), [preset, failingNodes])

  const rafRef = useRef<number | null>(null)
  const lastTickRef = useRef<number>(0)
  const speedRef = useRef(speed)
  useEffect(() => { speedRef.current = speed }, [speed])

  useEffect(() => {
    if (runStatus !== 'running') return
    lastTickRef.current = 0
    const tick = (ts: number) => {
      if (!lastTickRef.current) lastTickRef.current = ts
      const dt = (ts - lastTickRef.current) * speedRef.current
      lastTickRef.current = ts
      setElapsedMs((prev) => {
        const next = prev + dt
        if (next >= timeline.totalDuration) {
          setRunStatus('completed')
          return timeline.totalDuration
        }
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTickRef.current = 0
    }
  }, [runStatus, timeline.totalDuration])

  useEffect(() => {
    const passed = timeline.events.filter((e) => e.at <= elapsedMs)
    const newHistory: HistoryEntry[] = []
    const newEvents: LogEvent[] = []
    let liveStep = -1
    const startedSteps = new Set<number>()

    passed.forEach((ev) => {
      const step = preset.steps[ev.stepIndex]
      if (ev.kind === 'start') {
        newHistory.push({ stepIndex: ev.stepIndex, node: step.node, running: true, failed: false, attempt: ev.attempt })
        liveStep = ev.stepIndex
        if (!startedSteps.has(ev.stepIndex)) {
          startedSteps.add(ev.stepIndex)
          step.evts?.forEach(([lv, msg]) => newEvents.push({ t: Math.round(ev.at), lv, msg }))
        }
        if (ev.attempt > 1) {
          newEvents.push({ t: Math.round(ev.at), lv: 'info', msg: `${step.node} retrying · attempt ${ev.attempt}` })
        }
      } else if (ev.kind === 'retry') {
        const last = newHistory[newHistory.length - 1]
        last.running = false
        last.failed = true
        newEvents.push({ t: Math.round(ev.at), lv: 'warn', msg: `${step.node} attempt ${ev.attempt} failed · injected · retry after 180ms (exp)` })
      } else {
        const last = newHistory[newHistory.length - 1]
        last.running = false
        last.failed = false
        liveStep = ev.stepIndex
      }
    })

    setHistory(newHistory)
    setEvents(newEvents)
    setCurrentStep(liveStep)
  }, [elapsedMs, timeline, preset])

  const logRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [events.length])

  const resetRun = useCallback(() => {
    setElapsedMs(0)
    setHistory([])
    setEvents([])
    setCurrentStep(-1)
    setRunStatus('idle')
    setSelectedStep(0)
    setSelectedNode(null)
  }, [])

  const onPlayPause = useCallback(() => {
    if (runStatus === 'running') {
      setRunStatus('paused')
    } else if (runStatus === 'completed' || runStatus === 'failed') {
      resetRun()
      setTimeout(() => setRunStatus('running'), 30)
    } else {
      setRunStatus('running')
    }
  }, [runStatus, resetRun])

  const onStep = useCallback(() => {
    const idx = timeline.events.findIndex((e) => e.kind === 'end' && e.at > elapsedMs)
    if (idx === -1) {
      setElapsedMs(timeline.totalDuration)
      setRunStatus('completed')
    } else {
      setRunStatus('paused')
      setElapsedMs(timeline.events[idx].at)
    }
  }, [timeline, elapsedMs])

  const onJumpTo = useCallback((stepIdx: number) => {
    const target = Math.max(0, Math.min(stepIdx, preset.steps.length))
    if (target === 0) { setElapsedMs(0); setRunStatus('idle'); return }
    const endEvt = timeline.events.filter((e) => e.kind === 'end' && e.stepIndex < target).pop()
    if (endEvt) {
      setRunStatus('paused')
      setElapsedMs(endEvt.at)
    } else {
      setElapsedMs(0); setRunStatus('idle')
    }
  }, [preset, timeline])

  const onForkFromHere = useCallback(() => {
    if (currentStep < 0) return
    const newId = Math.random().toString(16).slice(2, 10)
    const parent = activeRunId || runs[0]?.id || null
    setRuns((prev) => [
      { id: newId, graph: presetKey, status: 'COMPLETED', dur: Math.round(elapsedMs + 100), when: 'just now', parent, forkStep: currentStep },
      ...prev,
    ])
    setActiveRunId(newId)
    setEvents((prev) => [...prev, { t: Math.round(elapsedMs), lv: 'evt', msg: `forked → ${newId} · branched from step ${currentStep}` }])
  }, [currentStep, activeRunId, runs, presetKey, elapsedMs])

  const totalDuration = timeline.totalDuration
  const totalSteps = preset.steps.length

  const stepToShow = preset.steps[Math.max(0, Math.min(selectedStep, totalSteps - 1))]
  let stepDoneIdx = -1
  for (let i = history.length - 1; i >= 0; i--) {
    if (!history[i].running && !history[i].failed) { stepDoneIdx = i; break }
  }
  const lastDoneStep = stepDoneIdx >= 0 ? history[stepDoneIdx].stepIndex : -1

  const liveState = useMemo(() => {
    let s: Record<string, unknown> = { ...preset.state }
    preset.steps.forEach((step, idx) => {
      if (idx <= lastDoneStep) s = { ...s, ...step.after }
    })
    return s
  }, [preset, lastDoneStep])

  const toggleFailing = (nodeId: string) => {
    setFailingNodes((prev) => {
      const n = new Set(prev)
      if (n.has(nodeId)) n.delete(nodeId); else n.add(nodeId)
      return n
    })
    resetRun()
  }

  const onPickNodeOnGraph = (nodeId: string) => {
    setSelectedNode(nodeId)
    const lastH = [...history].reverse().find((h) => h.node === nodeId)
    if (lastH) setSelectedStep(lastH.stepIndex)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        onPlayPause()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onPlayPause])

  const changePreset = (k: string) => { setPresetKey(k); resetRun() }

  return (
    <div className="flex-1 flex flex-col">
      <SandboxHeader
        presetKey={presetKey}
        setPresetKey={changePreset}
        onShare={() => window.alert('Trace exported: trace-' + Math.random().toString(16).slice(2, 8) + '.json')}
        onReset={resetRun}
      />

      <div className="border-b hairline bg-ink-50/60 dark:bg-ink-900/30">
        <div className="max-w-[1500px] mx-auto px-6 lg:px-8 grid grid-cols-2 md:grid-cols-5 gap-px bg-ink-100 dark:bg-ink-900 border-x hairline">
          <MetricTile label="Preset" value={preset.label} sub={preset.desc} />
          <MetricTile
            label="Status"
            value={runStatus.toUpperCase()}
            tone={runStatus === 'running' ? 'accent' : runStatus === 'completed' ? 'ok' : runStatus === 'failed' ? 'err' : undefined}
            sub={runStatus === 'running' ? `step ${currentStep + 1} of ${totalSteps}` : runStatus === 'completed' ? 'execution finished' : 'press run to start'}
          />
          <MetricTile label="Duration" value={`${Math.round(elapsedMs)}ms`} sub={`of ${totalDuration}ms total`} />
          <MetricTile
            label="Steps"
            value={`${Math.max(0, lastDoneStep + 1)} / ${totalSteps}`}
            sub={`${preset.nodes.filter((n) => n.kind !== 'terminal').length} nodes · ${preset.edges.length} edges`}
          />
          <MetricTile label="Replays" value={runs.length} sub={`${runs.filter((r) => r.forkStep != null).length} forks`} tone="accent" />
        </div>
      </div>

      <div className="border-b hairline bg-white dark:bg-ink-950">
        <div className="max-w-[1500px] mx-auto px-6 lg:px-8 py-2.5 flex items-center gap-2 overflow-x-auto scroll-thin">
          {SANDBOX_VIEWS.map((v) => (
            <button
              type="button"
              key={v.id}
              onClick={() => setView(v.id)}
              className={`group flex items-center gap-2 px-3 h-9 rounded-md text-[12.5px] font-medium tracking-tight whitespace-nowrap transition-colors ${
                view === v.id ? 'bg-ink-950 text-white dark:bg-white dark:text-ink-950' : 'text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-900'
              }`}
            >
              <SbIcon name={v.icon} size={13} />
              <span>{v.label}</span>
              <span className={`hidden md:inline mono text-[10px] uppercase tracking-wider ${view === v.id ? 'text-white/60 dark:text-ink-950/60' : 'text-ink-400 dark:text-ink-600'}`}>
                · {v.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {view === 'execution' && (
        <div className="flex-1 max-w-[1500px] w-full mx-auto px-6 lg:px-8 py-5 grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-4 min-h-0">
          <div className="flex flex-col gap-4 min-h-0">
            <div className="flex border hairline rounded-lg overflow-hidden">
              {([['presets', 'Presets'], ['source', 'Source'], ['inject', 'Inject']] as Array<[LeftTab, string]>).map(([k, l], i) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setLeftTab(k)}
                  className={`flex-1 h-8 text-[12px] font-medium ${
                    leftTab === k ? 'bg-ink-950 text-white dark:bg-white dark:text-ink-950' : 'text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-900'
                  } ${i > 0 ? 'border-l hairline' : ''}`}
                >
                  {l}
                </button>
              ))}
            </div>

            {leftTab === 'presets' && (
              <SbPanel title="Presets · 3">
                <div className="p-2 space-y-1.5">
                  {Object.entries(PRESETS).map(([k, p]) => (
                    <button
                      type="button"
                      key={k}
                      onClick={() => changePreset(k)}
                      className={`w-full text-left rounded-lg border px-3 py-3 transition-colors ${
                        presetKey === k ? 'border-ink-950 dark:border-white bg-ink-50 dark:bg-ink-900' : 'hairline hover:bg-ink-50 dark:hover:bg-ink-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="mono text-[12px] text-ink-950 dark:text-white">{p.label}</span>
                        <Badge tone="neutral">{p.steps.length} steps</Badge>
                      </div>
                      <p className="text-[11.5px] text-ink-600 dark:text-ink-400 leading-relaxed">{p.desc}</p>
                    </button>
                  ))}
                </div>
                <div className="px-3 pb-3 pt-1 border-t hairline mt-1">
                  <button type="button" className="w-full px-3 py-2.5 text-[12px] text-ink-500 hover:text-ink-950 dark:hover:text-white inline-flex items-center justify-center gap-1.5 border border-dashed hairline rounded-md">
                    <SbIcon name="plus" size={12} /> Build your own graph
                  </button>
                </div>
              </SbPanel>
            )}

            {leftTab === 'source' && (
              <SbPanel
                title={`${preset.label} · Java`}
                action={<button type="button" className="text-[10.5px] mono text-ink-500 hover:text-ink-950 dark:hover:text-white">copy</button>}
                bodyClass="bg-ink-950"
              >
                <CodeView src={SOURCE[presetKey]} />
              </SbPanel>
            )}

            {leftTab === 'inject' && (
              <SbPanel title="Failure injection">
                <div className="p-3 space-y-2">
                  <p className="text-[12px] text-ink-600 dark:text-ink-400 leading-relaxed mb-2">
                    Toggle a node to make it fail on its first attempt. The runtime will retry with exponential backoff.
                  </p>
                  {preset.nodes.filter((n) => n.kind !== 'terminal').map((n) => {
                    const active = failingNodes.has(n.id)
                    return (
                      <label
                        key={n.id}
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md border cursor-pointer ${
                          active ? 'border-rose-300 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-700' : 'hairline hover:bg-ink-50 dark:hover:bg-ink-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="mono text-[12px] text-ink-950 dark:text-white">{n.label}</span>
                          {n.sub && <span className="mono text-[10px] text-ink-500">· {n.sub}</span>}
                        </div>
                        <input type="checkbox" checked={active} onChange={() => toggleFailing(n.id)} className="accent-rose-500" />
                      </label>
                    )
                  })}
                </div>
              </SbPanel>
            )}
          </div>

          <div className="flex flex-col gap-4 min-h-0">
            <SbPanel
              title={`Execution · ${presetKey}`}
              action={<span className="mono text-[10.5px] text-ink-500">{history.length > 0 ? `exec ${(activeRunId || 'live').slice(0, 8)}` : 'awaiting run'}</span>}
              className="flex-1 min-h-[440px]"
            >
              <GraphCanvas
                preset={preset}
                history={history}
                currentStep={currentStep}
                runStatus={runStatus}
                failingNodes={failingNodes}
                onPickNode={onPickNodeOnGraph}
                selectedNode={selectedNode}
              />
            </SbPanel>

            <SbPanel
              title="Log stream"
              action={<span className="mono text-[10.5px] text-ink-500">{events.length} events</span>}
              className="h-[220px] flex-none"
            >
              <LogStream events={events} autoScrollRef={logRef} />
            </SbPanel>
          </div>

          <div className="flex flex-col gap-4 min-h-0">
            <div className="flex border hairline rounded-lg overflow-hidden">
              {([['diff', 'Diff'], ['state', 'State'], ['steps', 'Steps'], ['lineage', 'Lineage']] as Array<[RightTab, string]>).map(([k, l], i) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setRightTab(k)}
                  className={`flex-1 h-8 text-[12px] font-medium ${
                    rightTab === k ? 'bg-ink-950 text-white dark:bg-white dark:text-ink-950' : 'text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-900'
                  } ${i > 0 ? 'border-l hairline' : ''}`}
                >
                  {l}
                </button>
              ))}
            </div>

            {rightTab === 'diff' && (
              <SbPanel
                title={`Diff · step #${String(selectedStep).padStart(2, '0')} · ${stepToShow.node}`}
                action={<SbBtn variant="ghost" size="xs" icon="git-branch" onClick={onForkFromHere}>Fork</SbBtn>}
                className="flex-1"
              >
                <DiffView step={stepToShow} />
              </SbPanel>
            )}

            {rightTab === 'state' && (
              <SbPanel title={lastDoneStep >= 0 ? `Live state · after step ${lastDoneStep}` : 'Initial state'} className="flex-1">
                <StateView state={lastDoneStep >= 0 ? liveState : preset.state} />
              </SbPanel>
            )}

            {rightTab === 'steps' && (
              <SbPanel title={`Timeline · ${totalSteps} steps`} className="flex-1">
                <StepTimeline
                  preset={preset}
                  history={history}
                  currentStep={selectedStep}
                  onPick={(idx) => { setSelectedStep(idx); onJumpTo(idx + 1) }}
                  totalDuration={Math.max(...preset.steps.map((s) => s.dur))}
                />
              </SbPanel>
            )}

            {rightTab === 'lineage' && (
              <SbPanel
                title={`Lineage · ${runs.length} runs`}
                action={<span className="mono text-[10.5px] text-ink-500">{runs.filter((r) => r.forkStep != null).length} forks</span>}
                className="flex-1"
              >
                <LineageView runs={runs} activeId={activeRunId} onPick={setActiveRunId} />
              </SbPanel>
            )}

            <CoachCard
              runStatus={runStatus}
              hasFork={runs.some((r) => r.forkStep != null && r.when === 'just now')}
              failingCount={failingNodes.size}
            />
          </div>
        </div>
      )}

      {view !== 'execution' && (
        <div className="flex-1 max-w-[1500px] w-full mx-auto px-6 lg:px-8 py-5 min-h-[640px]">
          {view === 'knowledge' && <KnowledgeGraph />}
          {view === 'waterfall' && <Waterfall preset={preset} failingNodes={failingNodes} />}
          {view === 'api'       && <ApiConsole />}
        </div>
      )}

      {view === 'execution' && (
        <TransportBar
          runStatus={runStatus}
          currentStep={currentStep}
          totalSteps={totalSteps}
          totalDuration={totalDuration}
          elapsedMs={elapsedMs}
          speed={speed}
          setSpeed={setSpeed}
          onPlayPause={onPlayPause}
          onStep={onStep}
          onJumpTo={onJumpTo}
          onForkFromHere={onForkFromHere}
        />
      )}
    </div>
  )
}
