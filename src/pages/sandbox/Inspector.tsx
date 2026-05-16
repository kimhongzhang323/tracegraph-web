import type { RefObject } from 'react'
import { Badge } from '@/components/Badge'
import { SbStatusDot } from './atoms'
import type { HistoryEntry, LogEvent, Preset, PresetStep, RunRecord } from './types'

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'boolean' || typeof v === 'number') return String(v)
  if (typeof v === 'string') return v
  return JSON.stringify(v)
}

export function StateView({ state }: { state: Record<string, unknown> }) {
  const entries = Object.entries(state)
  if (entries.length === 0) {
    return <div className="px-4 py-3 mono text-[12px] text-ink-500">{'{ }'}</div>
  }
  return (
    <div className="px-4 py-3 mono text-[12px] space-y-1">
      <div className="text-ink-500">{'{'}</div>
      {entries.map(([k, v]) => (
        <div key={k} className="pl-4 flex gap-2">
          <span className="text-ink-600 dark:text-ink-400">{k}:</span>
          <span className={
            v === null || v === undefined ? 'text-ink-400'
              : typeof v === 'number' ? 'text-accent-700 dark:text-accent-100'
                : typeof v === 'boolean' ? 'text-amber-600 dark:text-amber-300'
                  : 'text-ink-950 dark:text-white'
          }>
            {fmtVal(v)}
          </span>
        </div>
      ))}
      <div className="text-ink-500">{'}'}</div>
    </div>
  )
}

export function DiffView({ step }: { step?: PresetStep }) {
  if (!step) return <div className="px-4 py-6 text-center text-[12px] text-ink-500">No step selected</div>
  return (
    <div className="px-4 py-3 mono text-[12px] space-y-1">
      {step.diff.map((line, i) => {
        const [op, text] = line
        const cls =
          op === '+' ? 'text-emerald-700 dark:text-emerald-400'
            : op === '-' ? 'text-rose-600 dark:text-rose-400'
              : op === '!' ? 'text-amber-600 dark:text-amber-400'
                : 'text-ink-700 dark:text-ink-300'
        return (
          <div key={i} className={cls}>
            <span className="inline-block w-3 text-ink-400">{op === ' ' ? ' ' : op}</span>
            {text}
          </div>
        )
      })}
      {step.usage && (
        <div className="mt-3 pt-3 border-t hairline">
          <div className="text-[10.5px] uppercase tracking-wider text-ink-500 mb-1">llm usage</div>
          <div className="text-ink-700 dark:text-ink-300">prompt {step.usage.prompt} · completion {step.usage.completion}</div>
        </div>
      )}
    </div>
  )
}

interface StepTimelineProps {
  preset: Preset
  history: HistoryEntry[]
  currentStep: number
  onPick: (idx: number) => void
  totalDuration: number
}

export function StepTimeline({ preset, history, currentStep, onPick, totalDuration }: StepTimelineProps) {
  const steps = preset.steps
  const status = steps.map((s) => {
    const h = history.filter((x) => x.stepIndex === s.i)
    if (h.length === 0) return 'pending' as const
    const last = h[h.length - 1]
    if (last.running) return 'running' as const
    if (last.failed) return 'failed' as const
    return 'done' as const
  })
  return (
    <div className="px-3 py-3 space-y-1.5">
      {steps.map((s, idx) => {
        const st = status[idx]
        const isCurrent = currentStep === idx
        const widthPct = Math.max(8, (s.dur / Math.max(totalDuration, 1)) * 100)
        return (
          <button
            key={s.i}
            type="button"
            onClick={() => onPick(idx)}
            className={`w-full text-left rounded-md border transition-colors px-2.5 py-2 flex items-center gap-2.5 ${
              isCurrent ? 'border-ink-950 dark:border-white bg-ink-50 dark:bg-ink-900' : 'hairline hover:bg-ink-50 dark:hover:bg-ink-900'
            }`}
          >
            <span className="mono text-[10.5px] text-ink-500 w-6 text-right">#{String(s.i).padStart(2, '0')}</span>
            <span className="flex items-center gap-1.5 min-w-0">
              <SbStatusDot
                tone={st === 'running' ? 'accent' : st === 'done' ? 'ok' : st === 'failed' ? 'err' : 'neutral'}
                pulse={st === 'running'}
              />
              <span className="mono text-[12px] text-ink-950 dark:text-white truncate">{s.node}</span>
            </span>
            <span className="flex-1 h-[3px] rounded-full bg-ink-100 dark:bg-ink-900 overflow-hidden relative ml-1">
              <span
                className={`absolute left-0 top-0 bottom-0 ${
                  st === 'done' ? 'bg-ink-700 dark:bg-ink-300'
                    : st === 'running' ? 'bg-accent-500'
                      : st === 'failed' ? 'bg-rose-500'
                        : 'bg-transparent'
                }`}
                style={{ width: st === 'pending' ? '0%' : `${widthPct}%` }}
              />
            </span>
            <span className="mono text-[10.5px] text-ink-500 tabular-nums w-12 text-right">{s.dur}ms</span>
            {(s.attempts ?? 0) > 1 && <Badge tone="warn">↻{s.attempts}</Badge>}
            {s.branches && <Badge tone="neutral">×{s.branches}</Badge>}
          </button>
        )
      })}
    </div>
  )
}

const lvCls: Record<LogEvent['lv'], string> = {
  evt: 'text-accent-600 dark:text-accent-100',
  info: 'text-ink-600 dark:text-ink-400',
  warn: 'text-amber-600 dark:text-amber-400',
  err: 'text-rose-600 dark:text-rose-400',
}

export function LogStream({ events, autoScrollRef }: { events: LogEvent[]; autoScrollRef: RefObject<HTMLDivElement> }) {
  return (
    <div ref={autoScrollRef} className="h-full overflow-auto scroll-thin mono text-[11.5px] leading-relaxed px-4 py-3 bg-ink-50/40 dark:bg-ink-950/40">
      {events.length === 0 ? (
        <div className="text-ink-500 italic">Run the graph to stream events here.</div>
      ) : (
        events.map((e, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-ink-400 tabular-nums w-10 text-right">{String(e.t).padStart(4, ' ')}ms</span>
            <span className={`${lvCls[e.lv]} uppercase tracking-wider w-10`}>{e.lv}</span>
            <span className="text-ink-700 dark:text-ink-300 break-words flex-1">{e.msg}</span>
          </div>
        ))
      )}
    </div>
  )
}

export function CodeView({ src }: { src: string }) {
  const KW = /\b(record|class|public|private|new|return|var|final|true|false|null|List|Duration|Optional)\b/g
  const STR = /"([^"]*)"/g
  const COM = /\/\/.*$/gm
  let h = src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  h = h.replace(COM, (m) => `<span class="cm">${m}</span>`)
  h = h.replace(STR, (m) => `<span class="st">${m}</span>`)
  h = h.replace(KW, (m) => `<span class="kw">${m}</span>`)
  h = h.replace(/\.([a-zA-Z_]+)\(/g, '.<span class="nm">$1</span>(')
  return <pre className="code-block px-5 py-4 text-ink-800 dark:text-ink-200" dangerouslySetInnerHTML={{ __html: h }} />
}

interface LineageProps {
  runs: RunRecord[]
  activeId: string | null
  onPick: (id: string) => void
}

export function LineageView({ runs, activeId, onPick }: LineageProps) {
  const byParent: Record<string, RunRecord[]> = {}
  runs.forEach((r) => {
    const k = r.parent || '_root'
    ;(byParent[k] ||= []).push(r)
  })
  const renderRun = (r: RunRecord, depth = 0) => (
    <div key={r.id}>
      <button
        type="button"
        onClick={() => onPick(r.id)}
        className={`w-full text-left grid grid-cols-[1fr_auto] gap-2 items-center px-3 py-2 rounded-md border ${
          r.id === activeId ? 'border-ink-950 dark:border-white bg-ink-50 dark:bg-ink-900' : 'hairline hover:bg-ink-50 dark:hover:bg-ink-900'
        }`}
        style={{ marginLeft: depth * 16 }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {depth > 0 && <span className="mono text-[10px] text-ink-500 -ml-2.5">↳</span>}
          <SbStatusDot tone={r.status === 'COMPLETED' ? 'ok' : r.status === 'INTERRUPTED' ? 'warn' : 'err'} />
          <span className="mono text-[12px] text-ink-950 dark:text-white truncate">{r.id}</span>
          {r.forkStep != null && <Badge tone="accent">fork@{r.forkStep}</Badge>}
        </div>
        <span className="mono text-[10.5px] text-ink-500 tabular-nums">{r.dur}ms</span>
      </button>
      {(byParent[r.id] || []).map((child) => renderRun(child, depth + 1))}
    </div>
  )
  return (
    <div className="px-3 py-3 space-y-1.5">
      {(byParent._root || []).map((r) => renderRun(r, 0))}
    </div>
  )
}
