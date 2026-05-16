export type NodeKind = 'node' | 'parallel' | 'async' | 'terminal'

export interface PresetNode {
  id: string
  label: string
  x: number
  y: number
  w: number
  h: number
  kind: NodeKind
  sub?: string
}

export interface PresetEdge {
  from: string
  to: string
  label?: string
}

export type DiffOp = ' ' | '+' | '-' | '!'

export interface PresetStep {
  i: number
  node: string
  kind: 'sync' | 'parallel' | 'async'
  dur: number
  ok: boolean
  attempts?: number
  branches?: number
  loop?: number
  usage?: { prompt: number; completion: number }
  before: Record<string, unknown>
  after: Record<string, unknown>
  diff: Array<[DiffOp, string]>
  evts?: Array<[LogLevel, string]>
}

export interface Preset {
  label: string
  desc: string
  state: Record<string, unknown>
  nodes: PresetNode[]
  edges: PresetEdge[]
  steps: PresetStep[]
}

export type LogLevel = 'evt' | 'info' | 'warn' | 'err'

export interface LogEvent {
  t: number
  lv: LogLevel
  msg: string
}

export interface RunRecord {
  id: string
  graph: string
  status: 'COMPLETED' | 'INTERRUPTED' | 'FAILED'
  dur: number
  when: string
  parent: string | null
  forkStep: number | null
}

export type RunStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed'

export interface HistoryEntry {
  stepIndex: number
  node: string
  running: boolean
  failed: boolean
  attempt: number
}

export interface KGNode {
  id: string
  label: string
  type: 'doc' | 'chunk' | 'entity' | 'query'
  tag?: string
  meta?: string
  parent?: string
}

export interface KGEdge {
  from: string
  to: string
  kind: 'parent' | 'mentions' | 'retrieved' | 'related'
}
