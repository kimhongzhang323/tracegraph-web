import type { Preset, RunRecord } from './types'

export const PRESETS: Record<string, Preset> = {
  'order-pipeline': {
    label: 'Order pipeline',
    desc: 'Validate → enrich (parallel) → score (LLM) → charge (retries) → ship.',
    state: { id: 'o-91', valid: false, charged: false, shipped: false },
    nodes: [
      { id: 'entry',    label: 'entry',    x: 360, y:  40, w: 110, h: 36, kind: 'terminal' },
      { id: 'validate', label: 'validate', x: 360, y: 120, w: 130, h: 56, kind: 'node' },
      { id: 'enrich',   label: 'enrich',   x: 160, y: 230, w: 150, h: 56, kind: 'parallel', sub: 'parallel · 3' },
      { id: 'score',    label: 'score',    x: 540, y: 230, w: 150, h: 56, kind: 'async',    sub: 'async · llm' },
      { id: 'charge',   label: 'charge',   x: 360, y: 340, w: 130, h: 56, kind: 'node',     sub: 'retry · 3x' },
      { id: 'ship',     label: 'ship',     x: 360, y: 440, w: 130, h: 56, kind: 'node' },
      { id: 'done',     label: 'terminal', x: 380, y: 530, w:  90, h: 32, kind: 'terminal' },
    ],
    edges: [
      { from: 'entry',    to: 'validate' },
      { from: 'validate', to: 'enrich',   label: 'valid' },
      { from: 'validate', to: 'score',    label: 'valid' },
      { from: 'enrich',   to: 'charge' },
      { from: 'score',    to: 'charge',   label: 'risk<.5' },
      { from: 'charge',   to: 'ship',     label: 'charged' },
      { from: 'ship',     to: 'done' },
    ],
    steps: [
      { i: 0, node: 'validate', kind: 'sync', dur: 12, ok: true,
        before: { valid: false }, after: { valid: true },
        diff: [[' ', 'id: o-91'], ['-', 'valid: false'], ['+', 'valid: true']],
        evts: [['evt', 'validate started'], ['info', 'validate ok · 12ms']] },
      { i: 1, node: 'enrich', kind: 'parallel', dur: 184, ok: true, branches: 3,
        before: { profile: null, fraud: null, inventory: null },
        after:  { profile: 'PRO', fraud: 0.04, inventory: 'IN_STOCK' },
        diff: [[' ', 'id: o-91'], ['+', 'profile: PRO'], ['+', 'fraud: 0.04'], ['+', 'inventory: IN_STOCK']],
        evts: [['evt', 'parallel(enrich) fan-out · 3 branches'], ['info', 'branch profile · 64ms'], ['info', 'branch fraud · 121ms'], ['info', 'branch inventory · 184ms'], ['info', 'parallel merged · 184ms']] },
      { i: 2, node: 'score', kind: 'async', dur: 312, ok: true,
        usage: { prompt: 482, completion: 96 },
        before: { riskScore: null }, after: { riskScore: 0.18 },
        diff: [[' ', 'id: o-91'], ['+', 'riskScore: 0.18'], [' ', 'tokens: 482+96']],
        evts: [['evt', 'async(score) submitted'], ['info', 'async ok · 312ms · usage{p=482,c=96}']] },
      { i: 3, node: 'charge', kind: 'sync', dur: 421, ok: true, attempts: 2,
        before: { charged: false }, after: { charged: true, attempts: 2 },
        diff: [[' ', 'attempt 1: NetworkTimeoutException'], ['!', 'retry after 200ms (exp)'], [' ', 'attempt 2: ok'], ['+', 'charged: true'], ['+', 'attempts: 2 (recovered)']],
        evts: [['info', 'charge attempt 1/3'], ['warn', 'attempt 1 failed · NetworkTimeoutException · retry 200ms'], ['info', 'attempt 2 ok · 218ms']] },
      { i: 4, node: 'ship', kind: 'sync', dur: 92, ok: true,
        before: { shipped: false }, after: { shipped: true },
        diff: [[' ', 'id: o-91'], ['+', 'shipped: true']],
        evts: [['info', 'ship ok · 92ms'], ['evt', 'execution finished · COMPLETED']] },
    ],
  },

  'rag-agent': {
    label: 'RAG agent',
    desc: 'Embed query → retrieve → rerank → answer (LLM, streaming).',
    state: { q: 'Why did Q4 deploy fail?', docs: 0, answer: null },
    nodes: [
      { id: 'entry',    label: 'entry',    x: 360, y:  40, w: 110, h: 36, kind: 'terminal' },
      { id: 'embed',    label: 'embed',    x: 360, y: 130, w: 140, h: 56, kind: 'async', sub: '1536-d' },
      { id: 'retrieve', label: 'retrieve', x: 360, y: 230, w: 140, h: 56, kind: 'node',  sub: 'top·k=8' },
      { id: 'rerank',   label: 'rerank',   x: 360, y: 330, w: 140, h: 56, kind: 'async', sub: 'cross-enc' },
      { id: 'answer',   label: 'answer',   x: 360, y: 430, w: 140, h: 56, kind: 'async', sub: 'stream · llm' },
      { id: 'done',     label: 'terminal', x: 380, y: 530, w:  90, h: 32, kind: 'terminal' },
    ],
    edges: [
      { from: 'entry',    to: 'embed' },
      { from: 'embed',    to: 'retrieve' },
      { from: 'retrieve', to: 'rerank', label: 'docs>0' },
      { from: 'rerank',   to: 'answer' },
      { from: 'answer',   to: 'done' },
    ],
    steps: [
      { i: 0, node: 'embed', kind: 'async', dur: 142, ok: true,
        before: { vec: null }, after: { vec: '[1536]' },
        diff: [[' ', 'q: "Why did Q4 deploy fail?"'], ['+', 'vec: f32[1536]']],
        evts: [['evt', 'embed submitted'], ['info', 'embed ok · 142ms']] },
      { i: 1, node: 'retrieve', kind: 'sync', dur: 86, ok: true,
        before: { docs: 0 }, after: { docs: 8 },
        diff: [[' ', 'k: 8'], ['+', 'docs: 8 (cosine 0.71-0.89)']],
        evts: [['info', 'retrieve ok · 86ms · k=8']] },
      { i: 2, node: 'rerank', kind: 'async', dur: 198, ok: true,
        before: { docs: 8 }, after: { docs: 4 },
        diff: [[' ', 'top-k → 4'], ['+', 'rerank scores: [0.94,0.91,0.86,0.81]']],
        evts: [['evt', 'rerank submitted'], ['info', 'rerank ok · 198ms']] },
      { i: 3, node: 'answer', kind: 'async', dur: 612, ok: true, usage: { prompt: 1841, completion: 214 },
        before: { answer: null }, after: { answer: '…' },
        diff: [['+', 'answer: 214 tokens streamed'], [' ', 'tokens: 1841+214']],
        evts: [['evt', 'answer streaming…'], ['info', 'answer ok · 612ms · usage{p=1841,c=214}'], ['evt', 'execution finished · COMPLETED']] },
    ],
  },

  'react-agent': {
    label: 'ReAct agent',
    desc: 'Think → tool-call loop until done. Interrupts shown as steps.',
    state: { goal: 'fix flaky test', loops: 0, done: false },
    nodes: [
      { id: 'entry',  label: 'entry',    x: 360, y:  40, w: 110, h: 36, kind: 'terminal' },
      { id: 'think',  label: 'think',    x: 360, y: 130, w: 140, h: 56, kind: 'async', sub: 'llm' },
      { id: 'route',  label: 'route',    x: 360, y: 240, w: 140, h: 56, kind: 'node',  sub: 'tool / done' },
      { id: 'tool',   label: 'tool',     x: 160, y: 350, w: 140, h: 56, kind: 'node',  sub: 'shell · grep' },
      { id: 'answer', label: 'answer',   x: 540, y: 350, w: 140, h: 56, kind: 'node' },
      { id: 'done',   label: 'terminal', x: 540, y: 450, w:  90, h: 32, kind: 'terminal' },
    ],
    edges: [
      { from: 'entry',  to: 'think' },
      { from: 'think',  to: 'route' },
      { from: 'route',  to: 'tool',   label: 'tool' },
      { from: 'tool',   to: 'think' },
      { from: 'route',  to: 'answer', label: 'done' },
      { from: 'answer', to: 'done' },
    ],
    steps: [
      { i: 0, node: 'think', kind: 'async', dur: 240, ok: true,
        before: { plan: null }, after: { plan: 'grep "flaky" tests/' },
        diff: [['+', 'plan: grep "flaky" tests/']],
        evts: [['evt', 'think · llm submitted'], ['info', 'think ok · 240ms']] },
      { i: 1, node: 'route', kind: 'sync', dur: 4, ok: true,
        before: {}, after: { next: 'tool' },
        diff: [['+', 'route → tool']],
        evts: [['info', 'route · tool · 4ms']] },
      { i: 2, node: 'tool', kind: 'sync', dur: 138, ok: true,
        before: { tool: null }, after: { tool: 'grep · 3 matches' },
        diff: [['+', 'tool: grep'], ['+', 'matches: 3']],
        evts: [['info', 'tool ok · 138ms']] },
      { i: 3, node: 'think', kind: 'async', dur: 286, ok: true, loop: 2,
        before: { plan: 'grep' }, after: { plan: 'cat tests/auth.spec.ts' },
        diff: [[' ', 'loop: 2'], ['+', 'plan: cat tests/auth.spec.ts']],
        evts: [['evt', 'think · iter 2'], ['info', 'think ok · 286ms']] },
      { i: 4, node: 'route', kind: 'sync', dur: 3, ok: true,
        before: {}, after: { next: 'answer' },
        diff: [['+', 'route → answer']],
        evts: [['info', 'route · answer · 3ms']] },
      { i: 5, node: 'answer', kind: 'sync', dur: 18, ok: true,
        before: { done: false }, after: { done: true, fix: 'await race condition on line 42' },
        diff: [['+', 'done: true'], ['+', 'fix: await race condition on line 42']],
        evts: [['info', 'answer ok · 18ms'], ['evt', 'execution finished · COMPLETED']] },
    ],
  },
}

export const SOURCE: Record<string, string> = {
  'order-pipeline': `record OrderState(String id, boolean valid,
                  boolean charged, boolean shipped) {}

Graph<OrderState> graph = Graph.<OrderState>builder()
    .node("validate", OrderNodes::validate)
    .parallel("enrich", List.of(
            (s, ctx) -> withProfile(s),
            (s, ctx) -> withFraudCheck(s),
            (s, ctx) -> withInventory(s)),
        (input, branches) -> merge(input, branches))
    .asyncNode("score", OrderNodes::scoreAsync)
    .node("charge", OrderNodes::charge,
        RetryPolicy.exponential(3, Duration.ofMillis(100),
                                 2.0, Duration.ofSeconds(2)))
    .node("ship", OrderNodes::ship)
    .entry("validate")
    .edge("validate", "enrich", OrderState::valid)
    .edge("enrich",   "score")
    .edge("score",    "charge")
    .edge("charge",   "ship",  OrderState::charged)
    .terminal("ship")
    .traceRecorder(new RecordingTraceRecorder(store))
    .build();

ExecutionResult<OrderState> r = graph.run(seed);`,

  'rag-agent': `record RagState(String q, float[] vec, List<Doc> docs, String answer) {}

Graph<RagState> graph = Graph.<RagState>builder()
    .asyncNode("embed",    RagNodes::embed)
    .node     ("retrieve", RagNodes::retrieve)
    .asyncNode("rerank",   RagNodes::rerank)
    .asyncNode("answer",   RagNodes::answerStreaming)
    .entry("embed")
    .edge("embed",    "retrieve")
    .edge("retrieve", "rerank", s -> s.docs().size() > 0)
    .edge("rerank",   "answer")
    .terminal("answer")
    .traceRecorder(new RecordingTraceRecorder(store))
    .build();`,

  'react-agent': `record ReActState(String goal, int loops, boolean done,
                  String plan, String tool, String answer) {}

Graph<ReActState> graph = Graph.<ReActState>builder()
    .asyncNode("think",  ReActNodes::think)
    .node     ("route",  ReActNodes::route)
    .node     ("tool",   ReActNodes::callTool)
    .node     ("answer", ReActNodes::finalize)
    .entry("think")
    .edge("think",  "route")
    .edge("route",  "tool",   s -> "tool".equals(s.next()))
    .edge("route",  "answer", s -> "answer".equals(s.next()))
    .edge("tool",   "think")
    .terminal("answer")
    .build();`,
}

export const RUNS_SEED: RunRecord[] = [
  { id: 'e9c4f1a2', graph: 'order-pipeline', status: 'COMPLETED',   dur: 1021, when: '2m ago',  parent: null,        forkStep: null },
  { id: '3a82d019', graph: 'order-pipeline', status: 'COMPLETED',   dur:  994, when: '11m ago', parent: 'e9c4f1a2',  forkStep: 3 },
  { id: '7f1d92cb', graph: 'rag-agent',      status: 'COMPLETED',   dur: 1038, when: '1h ago',  parent: null,        forkStep: null },
  { id: 'b40e87aa', graph: 'react-agent',    status: 'INTERRUPTED', dur:  540, when: '3h ago',  parent: null,        forkStep: null },
]
