import type { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-[100dvh] flex">
      {/* Left branding panel — always dark, grid + emerald gradient */}
      <aside className="hidden lg:flex lg:w-[400px] xl:w-[460px] flex-shrink-0 flex-col justify-between p-10 bg-ink-950 grid-bg relative overflow-hidden">
        {/* Emerald radial glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 90% 50% at 50% 0%, rgba(13,143,99,0.22), transparent 65%)',
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <GraphLogo />
          <span className="text-[15px] font-medium tracking-tight text-white">TraceGraph</span>
          <span className="mono text-[10px] text-ink-300 px-1.5 h-[18px] inline-flex items-center rounded bg-ink-900">
            v0.3.0
          </span>
        </div>

        {/* Center illustration */}
        <div className="relative z-10 flex flex-col gap-6">
          <GraphIllustration />
          <div>
            <p className="display-tight text-white text-2xl xl:text-3xl mb-2">
              Typed execution graphs
              <br />for the JVM.
            </p>
            <p className="text-[13px] text-ink-300 leading-relaxed max-w-[280px]">
              Replay any run, resume from a checkpoint, and observe every state
              transition — with full type safety.
            </p>
          </div>
        </div>

        {/* Bottom status */}
        <div className="relative z-10 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-500 pulse-dot" />
          <span className="mono text-[11px] text-ink-300">Open beta · Spring Boot starter</span>
        </div>
      </aside>

      {/* Right form panel */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white dark:bg-ink-950 min-h-[100dvh]">
        {/* Mobile-only logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <GraphLogo />
          <span className="text-[15px] font-medium tracking-tight text-ink-950 dark:text-white">TraceGraph</span>
        </div>
        <div className="w-full max-w-[360px] fade-up">
          {children}
        </div>
      </main>
    </div>
  )
}

function GraphLogo() {
  return (
    <svg viewBox="0 0 28 28" className="w-6 h-6 text-ink-950 dark:text-white lg:text-white" fill="none">
      <circle cx="6"  cy="7"  r="2.4" fill="currentColor" />
      <circle cx="22" cy="7"  r="2.4" fill="currentColor" />
      <circle cx="14" cy="14" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="6"  cy="21" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="22" cy="21" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 9.4 L13 12.4 M22 9.4 L15 12.4 M13 15.6 L6 18.6 M15 15.6 L22 18.6"
        stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function GraphIllustration() {
  return (
    <svg viewBox="0 0 240 200" className="w-full max-w-[260px]" fill="none">
      {/* Edges */}
      <line x1="80" y1="40"  x2="120" y2="100" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      <line x1="160" y1="40" x2="120" y2="100" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      <line x1="120" y1="100" x2="80"  y2="160" stroke="rgba(13,143,99,0.35)"   strokeWidth="1.5" />
      <line x1="120" y1="100" x2="160" y2="160" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      {/* Outer nodes — filled */}
      <circle cx="80"  cy="40"  r="14" fill="#1f1f1f" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <circle cx="160" cy="40"  r="14" fill="#1f1f1f" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <circle cx="80"  cy="160" r="14" fill="#0a6447" stroke="rgba(13,143,99,0.6)" strokeWidth="1" />
      <circle cx="160" cy="160" r="14" fill="#1f1f1f" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      {/* Center hub — accent ring */}
      <circle cx="120" cy="100" r="18" fill="#141414" stroke="rgba(13,143,99,0.5)" strokeWidth="1.5" />
      {/* Node labels */}
      <text x="80"  y="44"  textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="8" fill="rgba(255,255,255,0.4)">IN</text>
      <text x="160" y="44"  textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="8" fill="rgba(255,255,255,0.4)">IN</text>
      <text x="120" y="104" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="8" fill="rgba(13,143,99,0.9)">FN</text>
      <text x="80"  y="164" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="8" fill="rgba(13,143,99,0.9)">OK</text>
      <text x="160" y="164" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="8" fill="rgba(255,255,255,0.4)">ERR</text>
    </svg>
  )
}
