import type { ReactNode } from 'react'
import type { RunStatus } from './types'

type DotTone = 'ok' | 'warn' | 'err' | 'neutral' | 'accent'

const dotColors: Record<DotTone, string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  err: 'bg-rose-500',
  neutral: 'bg-ink-400',
  accent: 'bg-accent-500',
}

export function SbStatusDot({ tone = 'ok', pulse = false }: { tone?: DotTone; pulse?: boolean }) {
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColors[tone]} ${pulse ? 'pulse-dot' : ''}`} />
}

interface PanelProps {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClass?: string
}

export function SbPanel({ title, action, children, className = '', bodyClass = '' }: PanelProps) {
  return (
    <div className={`rounded-xl border hairline bg-white dark:bg-ink-950 flex flex-col min-h-0 overflow-hidden ${className}`}>
      <div className="px-3.5 py-2 border-b hairline flex items-center justify-between bg-ink-50/50 dark:bg-ink-900/40">
        <span className="mono text-[10.5px] uppercase tracking-[0.14em] text-ink-500">{title}</span>
        <div className="flex items-center gap-1">{action}</div>
      </div>
      <div className={`flex-1 overflow-auto scroll-thin min-h-0 ${bodyClass}`}>{children}</div>
    </div>
  )
}

export type IconName =
  | 'play' | 'pause' | 'skip-back' | 'skip-forward' | 'rotate-ccw' | 'git-branch'
  | 'arrow-right' | 'settings' | 'zap' | 'moon' | 'sun' | 'code' | 'layers'
  | 'github' | 'chevron-right' | 'x' | 'download' | 'plus'

export function SbIcon({ name, size = 14, className = '' }: { name: IconName; size?: number; className?: string }) {
  const c = 'currentColor'
  const sw = 1.6
  const paths: Record<IconName, ReactNode> = {
    play: <polygon points="6,4 20,12 6,20" fill={c} stroke="none" />,
    pause: <g><rect x="6" y="4" width="4" height="16" fill={c} stroke="none" /><rect x="14" y="4" width="4" height="16" fill={c} stroke="none" /></g>,
    'skip-back': <g><polygon points="19,4 7,12 19,20" fill={c} stroke="none" /><rect x="4" y="4" width="2" height="16" fill={c} stroke="none" /></g>,
    'skip-forward': <g><polygon points="5,4 17,12 5,20" fill={c} stroke="none" /><rect x="18" y="4" width="2" height="16" fill={c} stroke="none" /></g>,
    'rotate-ccw': <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></g>,
    'git-branch': <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></g>,
    'arrow-right': <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></g>,
    settings: <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /></g>,
    zap: <g fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></g>,
    moon: <g fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></g>,
    sun: <g fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" /></g>,
    code: <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></g>,
    layers: <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></g>,
    github: <g fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></g>,
    'chevron-right': <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></g>,
    x: <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></g>,
    download: <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></g>,
    plus: <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></g>,
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

interface BtnProps {
  variant?: 'primary' | 'ghost' | 'accent' | 'bare'
  size?: 'xs' | 'sm' | 'md'
  icon?: IconName
  iconRight?: IconName
  children?: ReactNode
  onClick?: () => void
  active?: boolean
  className?: string
  title?: string
}

export function SbBtn({
  variant = 'ghost', size = 'sm', icon, iconRight, children, onClick, active = false, className = '', title,
}: BtnProps) {
  const sizes = {
    xs: 'h-7 px-2.5 text-[11.5px] rounded-md gap-1.5',
    sm: 'h-8 px-3 text-[12.5px] rounded-md gap-1.5',
    md: 'h-9 px-3.5 text-[13px] rounded-lg gap-2',
  }
  const variants = {
    primary: 'bg-ink-950 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-950 dark:hover:bg-ink-100 border border-transparent',
    ghost:   `border hairline ${active ? 'bg-ink-100 dark:bg-ink-900 text-ink-950 dark:text-white' : 'bg-white dark:bg-ink-950 text-ink-700 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-900'}`,
    accent:  'bg-accent-500 text-white hover:bg-accent-600 border border-transparent',
    bare:    `${active ? 'bg-ink-100 dark:bg-ink-900 text-ink-950 dark:text-white' : 'text-ink-600 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-900'} border border-transparent`,
  }
  const iconSize = size === 'xs' ? 12 : 14
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center font-medium tracking-tight transition-colors select-none whitespace-nowrap ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {icon && <SbIcon name={icon} size={iconSize} />}
      {children}
      {iconRight && <SbIcon name={iconRight} size={iconSize} />}
    </button>
  )
}

export function RunPill({ status }: { status: RunStatus }) {
  const map: Record<RunStatus, [string, DotTone]> = {
    idle:      ['Idle', 'neutral'],
    running:   ['Running', 'accent'],
    paused:    ['Paused', 'warn'],
    completed: ['Completed', 'ok'],
    failed:    ['Failed', 'err'],
  }
  const [label, tone] = map[status]
  return (
    <span className="inline-flex items-center gap-2 mono text-[11px] uppercase tracking-wider text-ink-600 dark:text-ink-400">
      <SbStatusDot tone={tone} pulse={status === 'running'} />
      {label}
    </span>
  )
}
