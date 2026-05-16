import type { KGEdge, KGNode } from './types'

const KG_DOCS: KGNode[] = [
  { id: 'd1', label: 'on-call.md',           type: 'doc', tag: 'runbook',    meta: '12 chunks · last edit 2d ago' },
  { id: 'd2', label: 'deploy-pipeline.md',   type: 'doc', tag: 'runbook',    meta: '18 chunks · last edit 11d ago' },
  { id: 'd3', label: 'auth.adr.md',          type: 'doc', tag: 'adr',        meta: '9 chunks · last edit 22d ago' },
  { id: 'd4', label: 'payments-arch.md',     type: 'doc', tag: 'design',     meta: '24 chunks · last edit 5d ago' },
  { id: 'd5', label: 'rate-limit-rfc.md',    type: 'doc', tag: 'rfc',        meta: '7 chunks · last edit 31d ago' },
  { id: 'd6', label: 'incident-2024-08.md',  type: 'doc', tag: 'postmortem', meta: '14 chunks · last edit 84d ago' },
]

const mkChunk = (id: string, doc: string, label: string): KGNode => ({
  id, label, type: 'chunk', parent: doc, meta: `from ${doc}`,
})

const KG_CHUNKS: KGNode[] = [
  mkChunk('c1','d1','§ paging escalation'),
  mkChunk('c2','d1','§ severity matrix'),
  mkChunk('c3','d1','§ rollback steps'),
  mkChunk('c4','d1','§ comms playbook'),
  mkChunk('c5','d1','§ on-call rotation'),
  mkChunk('c6','d2','§ build & test'),
  mkChunk('c7','d2','§ canary windows'),
  mkChunk('c8','d2','§ blue/green'),
  mkChunk('c9','d2','§ rollback hooks'),
  mkChunk('c10','d2','§ kubernetes config'),
  mkChunk('c11','d2','§ release notes'),
  mkChunk('c12','d3','§ oauth flow'),
  mkChunk('c13','d3','§ session storage'),
  mkChunk('c14','d3','§ refresh tokens'),
  mkChunk('c15','d3','§ csrf model'),
  mkChunk('c16','d4','§ payments overview'),
  mkChunk('c17','d4','§ ledger invariants'),
  mkChunk('c18','d4','§ idempotency keys'),
  mkChunk('c19','d4','§ retry policy'),
  mkChunk('c20','d4','§ vendor adapters'),
  mkChunk('c21','d4','§ failure modes'),
  mkChunk('c22','d5','§ token bucket'),
  mkChunk('c23','d5','§ adaptive shedding'),
  mkChunk('c24','d5','§ tenancy quotas'),
  mkChunk('c25','d6','§ timeline'),
  mkChunk('c26','d6','§ root cause'),
  mkChunk('c27','d6','§ mitigation'),
  mkChunk('c28','d6','§ followups'),
  mkChunk('c29','d6','§ blast radius'),
  mkChunk('c30','d6','§ five whys'),
]

const KG_ENTITIES: KGNode[] = [
  { id: 'e1',  label: 'PagerDuty',     type: 'entity', tag: 'tool' },
  { id: 'e2',  label: 'Kubernetes',    type: 'entity', tag: 'tech' },
  { id: 'e3',  label: 'Argo Rollouts', type: 'entity', tag: 'tool' },
  { id: 'e4',  label: 'OrderService',  type: 'entity', tag: 'service' },
  { id: 'e5',  label: 'PaymentsAPI',   type: 'entity', tag: 'service' },
  { id: 'e6',  label: 'Stripe',        type: 'entity', tag: 'vendor' },
  { id: 'e7',  label: 'Adyen',         type: 'entity', tag: 'vendor' },
  { id: 'e8',  label: 'Postgres',      type: 'entity', tag: 'tech' },
  { id: 'e9',  label: 'Redis',         type: 'entity', tag: 'tech' },
  { id: 'e10', label: 'OAuth2',        type: 'entity', tag: 'protocol' },
  { id: 'e11', label: '@kim',          type: 'entity', tag: 'person' },
  { id: 'e12', label: '@diego',        type: 'entity', tag: 'person' },
]

const KG_QUERIES: KGNode[] = [
  { id: 'q1', label: 'why did Q4 deploy fail?',  type: 'query', meta: '2m ago · 1.04s · COMPLETED' },
  { id: 'q2', label: 'rotate on-call now',       type: 'query', meta: '1h ago · 482ms · COMPLETED' },
  { id: 'q3', label: 'idempotency for retries',  type: 'query', meta: '3h ago · 612ms · COMPLETED' },
  { id: 'q4', label: 'oauth refresh window',     type: 'query', meta: '9h ago · 318ms · COMPLETED' },
  { id: 'q5', label: 'incident comms checklist', type: 'query', meta: '1d ago · 224ms · COMPLETED' },
  { id: 'q6', label: 'how to enable canary',     type: 'query', meta: '2d ago · 401ms · COMPLETED' },
  { id: 'q7', label: 'rate limit per tenant',    type: 'query', meta: '5d ago · 188ms · COMPLETED' },
  { id: 'q8', label: 'stripe vs adyen tradeoff', type: 'query', meta: '8d ago · 921ms · COMPLETED' },
]

const MENTIONS: Array<[string, string]> = [
  ['c1','e1'],['c1','e11'],['c2','e1'],['c3','e3'],['c3','e2'],['c4','e1'],
  ['c5','e11'],['c5','e12'],['c6','e2'],['c7','e3'],['c7','e2'],['c8','e3'],
  ['c9','e3'],['c10','e2'],['c12','e10'],['c13','e9'],['c14','e10'],['c15','e10'],
  ['c16','e5'],['c16','e4'],['c17','e8'],['c18','e5'],['c18','e6'],['c19','e6'],
  ['c19','e7'],['c20','e6'],['c20','e7'],['c21','e5'],['c21','e7'],['c22','e9'],
  ['c23','e9'],['c25','e4'],['c25','e5'],['c26','e5'],['c26','e7'],['c27','e6'],
  ['c28','e12'],
]

const RETRIEVED: Array<[string, string[]]> = [
  ['q1', ['c25','c26','c27','c21']],
  ['q2', ['c1','c5','c2']],
  ['q3', ['c18','c19']],
  ['q4', ['c14','c12','c13']],
  ['q5', ['c4','c2']],
  ['q6', ['c7','c8','c10']],
  ['q7', ['c24','c22','c23']],
  ['q8', ['c20','c19','c21']],
]

const RELATED: Array<[string, string]> = [
  ['e2','e3'],['e6','e7'],['e4','e5'],['e8','e9'],['e10','e9'],['e1','e11'],['e11','e12'],
]

const KG_EDGES: KGEdge[] = [
  ...KG_CHUNKS.map((c): KGEdge => ({ from: c.id, to: c.parent ?? '', kind: 'parent' })),
  ...MENTIONS.map(([f, t]): KGEdge => ({ from: f, to: t, kind: 'mentions' })),
  ...RETRIEVED.flatMap(([q, cs]) => cs.map((c): KGEdge => ({ from: q, to: c, kind: 'retrieved' }))),
  ...RELATED.map(([f, t]): KGEdge => ({ from: f, to: t, kind: 'related' })),
]

export const KG = {
  nodes: [...KG_DOCS, ...KG_CHUNKS, ...KG_ENTITIES, ...KG_QUERIES],
  edges: KG_EDGES,
  stats: {
    nodes: KG_DOCS.length + KG_CHUNKS.length + KG_ENTITIES.length + KG_QUERIES.length,
    docs: KG_DOCS.length,
    chunks: KG_CHUNKS.length,
    entities: KG_ENTITIES.length,
    queries: KG_QUERIES.length,
    edges: KG_EDGES.length,
    dims: 1536,
    bytes: '14.7 MB',
  },
}
