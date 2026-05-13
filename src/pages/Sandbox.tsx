import { Link } from 'react-router-dom'

export function Sandbox() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ink-100 dark:bg-ink-900 text-[11px] font-medium text-ink-500 uppercase tracking-widest mb-5">
          Coming soon
        </div>
        <h1 className="display-tight text-2xl text-ink-950 dark:text-white mb-3">
          Sandbox
        </h1>
        <p className="text-[13px] text-ink-500 leading-relaxed mb-8">
          Run TraceGraph workflows directly in the browser without a backend.
          Interactive sandbox is coming soon.
        </p>
        <Link
          to="/trace"
          className="text-[13px] text-ink-500 hover:text-ink-950 dark:hover:text-white underline underline-offset-2 decoration-ink-300 dark:decoration-ink-700 transition-colors"
        >
          ← Back to Trace Explorer
        </Link>
      </div>
    </div>
  )
}
