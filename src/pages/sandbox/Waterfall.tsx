import { useMemo, useState } from 'react'
import { Badge } from '@/components/Badge'
import { SbPanel } from './atoms'
import type { Preset } from './types'

interface Attempt { a: number; t0: number; dur: number; ok: boolean }
interface Span { i: number; name: string; kind: 'sync' | 'parallel' | 'async'; attempts: Attempt[]; t0: number; dur: number; retries: number; usage?: { prompt: number; completion: number }; branches?: number }

export function Waterfall({ preset, failingNodes }: { preset: Preset; failingNodes: Set<string> }) {
  const spans = useMemo<Span[]>(() => {
    let cursor = 0
    return preset.steps.map((step) => {
      const wantsFail = failingNodes.has(step.node)
      const attempts = wantsFail ? 2 : step.attempts || 1
      const attemptDur = attempts === 1 ? step.dur : Math.round(step.dur / attempts)
      const list: Attempt[] = []
      let c = cursor
      for (let a = 1; a <= attempts; a++) {
        const isLast = a === attempts
        list.push({ a, t0: c, dur: attemptDur, ok: isLast })
        c += attemptDur
        if (!isLast) c += 180
      }
      const span: Span = { i: step.i, name: step.node, kind: step.kind, attempts: list, t0: cursor, dur: c - cursor, retries: attempts - 1, usage: step.usage, branches: step.branches }
      cursor = c
      return span
    })
  }, [preset, failingNodes])

  const total = spans.length ? spans[spans.length - 1].t0 + spans[spans.length - 1].dur : 1000
  const [hover, setHover] = useState<{ span: Span; attempt: Attempt } | null>(null)

  const ticks: number[] = []
  const step = Math.max(50, Math.ceil(total / 6 / 50) * 50)
  for (let t = 0; t <= total; t += step) ticks.push(t)

  const kindColor: Record<Span['kind'], string> = {
    sync: 'bg-ink-950 dark:bg-white',
    parallel: 'bg-accent-500',
    async: 'bg-amber-500',
  }

  return (
    <SbPanel
      title={`Waterfall · ${preset.label} · ${total}ms`}
      action={<span className="mono text-[10.5px] text-ink-500">{spans.length} spans · {spans.reduce((a, s) => a + s.retries, 0)} retries</span>}
      className="h-full"
    >
      <div className="px-4 pt-4 pb-2">
        <div className="grid grid-cols-[160px_1fr_72px] gap-3 items-center">
          <div className="mono text-[10px] uppercase tracking-wider text-ink-500">node</div>
          <div className="relative h-5">
            <div className="absolute inset-x-0 bottom-0 h-px bg-ink-200 dark:bg-ink-800" />
            {ticks.map((t) => (
              <div key={t} className="absolute bottom-0 -translate-x-1/2 text-center" style={{ left: `${(t / total) * 100}%` }}>
                <div className="mono text-[10px] text-ink-500">{t}ms</div>
                <div className="w-px h-1.5 bg-ink-300 dark:bg-ink-700 mx-auto" />
              </div>
            ))}
          </div>
          <div className="mono text-[10px] uppercase tracking-wider text-ink-500 text-right">duration</div>
        </div>

        <div className="mt-3 space-y-1.5">
          {spans.map((s) => (
            <div key={s.i} className="grid grid-cols-[160px_1fr_72px] gap-3 items-center group hover:bg-ink-50 dark:hover:bg-ink-900/40 rounded-md px-1 py-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="mono text-[10.5px] text-ink-500 w-6 text-right">#{String(s.i).padStart(2, '0')}</span>
                <span className="mono text-[12px] text-ink-950 dark:text-white truncate">{s.name}</span>
                <Badge tone={s.kind === 'parallel' ? 'accent' : s.kind === 'async' ? 'warn' : 'neutral'}>{s.kind}</Badge>
              </div>
              <div className="relative h-6 rounded">
                <div className="absolute inset-y-1 inset-x-0 rounded-md bg-ink-100/60 dark:bg-ink-900/40" />
                {s.attempts.map((a, ai) => (
                  <div
                    key={ai}
                    className={`absolute top-1.5 bottom-1.5 rounded-sm transition-all cursor-pointer ${!a.ok ? 'bg-rose-400' : kindColor[s.kind]}`}
                    style={{ left: `${(a.t0 / total) * 100}%`, width: `${Math.max(0.6, (a.dur / total) * 100)}%`, opacity: !a.ok ? 0.85 : 1 }}
                    onMouseEnter={() => setHover({ span: s, attempt: a })}
                    onMouseLeave={() => setHover(null)}
                  />
                ))}
                {s.usage && (
                  <span className="absolute -top-0.5 right-1 mono text-[9.5px] text-ink-500 hidden group-hover:inline">
                    ↳ {s.usage.prompt}+{s.usage.completion} tok
                  </span>
                )}
              </div>
              <div className="mono text-[10.5px] text-ink-500 text-right tabular-nums">
                {s.dur}ms
                {s.retries > 0 && <span className="text-amber-600 dark:text-amber-300 ml-1">↻{s.retries}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t hairline">
          {hover ? (
            <div className="flex items-center gap-4 mono text-[11px] flex-wrap">
              <span className="text-ink-500 uppercase tracking-wider">{hover.span.name} · attempt {hover.attempt.a}</span>
              <span className="text-ink-950 dark:text-white">{hover.attempt.dur}ms</span>
              <span className="text-ink-500">@ +{hover.attempt.t0}ms</span>
              <Badge tone={hover.attempt.ok ? 'ok' : 'err'}>{hover.attempt.ok ? 'ok' : 'failed'}</Badge>
              {hover.span.branches && <Badge tone="accent">parallel × {hover.span.branches}</Badge>}
              {hover.span.usage && <span className="text-ink-500">usage{`{p=${hover.span.usage.prompt},c=${hover.span.usage.completion}}`}</span>}
            </div>
          ) : (
            <div className="mono text-[11px] text-ink-500">Hover a bar to see attempt details.</div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-4 mono text-[10px] uppercase tracking-wider text-ink-500">
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 rounded-sm bg-ink-950 dark:bg-white" /> sync</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 rounded-sm bg-accent-500" /> parallel</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 rounded-sm bg-amber-500" /> async</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-2 rounded-sm bg-rose-400" /> failed attempt</span>
        </div>
      </div>
    </SbPanel>
  )
}
