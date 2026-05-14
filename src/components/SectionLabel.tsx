export function SectionLabel({ children, num, className = '', numClassName }: { children: React.ReactNode; num?: string; className?: string; numClassName?: string }) {
  return (
    <div className={`mono text-[11px] uppercase tracking-[0.16em] text-ink-600 dark:text-ink-400 ${className}`}>
      {num && <span className={`mr-2 ${numClassName ?? 'text-ink-600 dark:text-ink-400'}`}>/ {num}</span>}
      {children}
    </div>
  )
}
