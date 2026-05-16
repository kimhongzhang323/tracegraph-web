import type { ReactNode } from 'react'
import { Badge } from '@/components/Badge'
import { PRESETS } from './data'
import { RunPill, SbBtn } from './atoms'
import type { RunStatus } from './types'

interface SandboxHeaderProps {
  presetKey: string
  setPresetKey: (k: string) => void
  onShare: () => void
  onReset: () => void
}

export function SandboxHeader({ presetKey, setPresetKey, onShare, onReset }: SandboxHeaderProps) {
  const presetOpts = Object.entries(PRESETS).map(([k, v]) => ({ k, label: v.label }))
  return (
    <div className="border-b hairline bg-white dark:bg-ink-950">
      <div className="max-w-[1500px] mx-auto px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-end">
        <div>
          <div className="flex items-center gap-3 mono text-[10.5px] uppercase tracking-[0.16em] text-ink-500">
            <span>/ Sandbox</span>
            <span className="text-ink-300 dark:text-ink-700">·</span>
            <span>v0.3.0 · in-browser runtime</span>
            <Badge tone="accent">no backend</Badge>
          </div>
          <h1 className="display-tight text-[34px] sm:text-[42px] text-ink-950 dark:text-white mt-2">
            Run a graph. Replay it. Fork it.
          </h1>
          <p className="text-[14px] text-ink-600 dark:text-ink-400 mt-2 max-w-2xl">
            Everything the real TraceGraph runtime does, mocked in your browser.
            Pick a preset, hit <span className="mono">run</span>, watch nodes light up,
            scrub the timeline, and fork the run from any step.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex border hairline rounded-lg overflow-hidden">
            {presetOpts.map((p, i) => (
              <button
                type="button"
                key={p.k}
                onClick={() => setPresetKey(p.k)}
                className={`px-3 h-9 text-[12.5px] font-medium tracking-tight transition-colors ${
                  presetKey === p.k
                    ? 'bg-ink-950 text-white dark:bg-white dark:text-ink-950'
                    : 'text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-900'
                } ${i > 0 ? 'border-l hairline' : ''}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <SbBtn variant="ghost" size="md" icon="rotate-ccw" onClick={onReset}>Reset</SbBtn>
          <SbBtn variant="ghost" size="md" icon="download" onClick={onShare}>Share trace</SbBtn>
        </div>
      </div>
    </div>
  )
}

interface TransportBarProps {
  runStatus: RunStatus
  currentStep: number
  totalSteps: number
  totalDuration: number
  elapsedMs: number
  speed: number
  setSpeed: (v: number) => void
  onPlayPause: () => void
  onStep: () => void
  onJumpTo: (stepIdx: number) => void
  onForkFromHere: () => void
}

export function TransportBar({
  runStatus, currentStep, totalSteps, totalDuration, elapsedMs,
  speed, setSpeed, onPlayPause, onStep, onJumpTo, onForkFromHere,
}: TransportBarProps) {
  const pct = totalDuration > 0 ? Math.min(100, (elapsedMs / totalDuration) * 100) : 0
  return (
    <div className="border-t hairline bg-white dark:bg-ink-950 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <SbBtn variant="ghost" size="sm" icon="skip-back" onClick={() => onJumpTo(0)} title="Jump to start" />
          <SbBtn
            variant={runStatus === 'running' ? 'primary' : 'accent'}
            size="sm"
            icon={runStatus === 'running' ? 'pause' : 'play'}
            onClick={onPlayPause}
          >
            {runStatus === 'running' ? 'Pause' : runStatus === 'completed' || runStatus === 'failed' ? 'Replay' : 'Run'}
          </SbBtn>
          <SbBtn variant="ghost" size="sm" icon="skip-forward" onClick={onStep} title="Step forward" />
          <SbBtn variant="ghost" size="sm" icon="git-branch" onClick={onForkFromHere} title="Fork from current step">
            Fork
          </SbBtn>
        </div>

        <div className="flex-1 flex items-center gap-3 min-w-0">
          <span className="mono text-[10.5px] text-ink-500 tabular-nums">
            {String(Math.min(currentStep + 1, totalSteps)).padStart(2, '0')}/{String(totalSteps).padStart(2, '0')}
          </span>
          <div
            className="flex-1 relative h-2 cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const pctClick = (e.clientX - rect.left) / rect.width
              onJumpTo(Math.floor(pctClick * totalSteps))
            }}
          >
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-ink-100 dark:bg-ink-900" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-ink-950 dark:bg-white"
              style={{ width: `${pct}%` }}
            />
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex">
              {Array.from({ length: totalSteps + 1 }).map((_, i) => (
                <span
                  key={i}
                  className="block w-px h-2 bg-ink-300 dark:bg-ink-700"
                  style={{ marginLeft: i === 0 ? 0 : `calc(${100 / totalSteps}% - 1px)` }}
                />
              ))}
            </div>
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-ink-950 dark:bg-white border-2 border-white dark:border-ink-950"
              style={{ left: `${pct}%` }}
            />
          </div>
          <span className="mono text-[10.5px] text-ink-500 tabular-nums">
            {Math.round(elapsedMs)}ms / {totalDuration}ms
          </span>
        </div>

        <div className="flex items-center gap-3">
          <RunPill status={runStatus} />
          <div className="hidden md:flex items-center gap-1.5 mono text-[10.5px] text-ink-500">
            <span>speed</span>
            <div className="inline-flex border hairline rounded-md overflow-hidden">
              {[0.5, 1, 2, 4].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 h-7 text-[11px] ${
                    speed === s ? 'bg-ink-950 text-white dark:bg-white dark:text-ink-950' : 'text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-900'
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MetricTileProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'ok' | 'warn' | 'err' | 'accent'
}

export function MetricTile({ label, value, sub, tone }: MetricTileProps) {
  const toneCls = tone
    ? {
        ok: 'text-emerald-700 dark:text-emerald-300',
        warn: 'text-amber-700 dark:text-amber-300',
        err: 'text-rose-700 dark:text-rose-300',
        accent: 'text-accent-700 dark:text-accent-100',
      }[tone]
    : 'text-ink-950 dark:text-white'
  return (
    <div className="px-5 py-4 bg-white dark:bg-ink-950">
      <div className="mono text-[10px] uppercase tracking-wider text-ink-500">{label}</div>
      <div className={`display-tight text-[26px] mt-1.5 tabular-nums ${toneCls}`}>{value}</div>
      {sub && <div className="mt-1 text-[12px] text-ink-500">{sub}</div>}
    </div>
  )
}
