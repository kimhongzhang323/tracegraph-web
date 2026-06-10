export function PageLoader() {
  return (
    <div className="w-full min-h-[400px] flex flex-col items-center justify-center gap-4 fade-up">
      <div className="relative w-10 h-10">
        {/* Ring background */}
        <div className="absolute inset-0 rounded-full border-2 border-ink-100 dark:border-ink-800" />
        {/* Spinning indicator */}
        <div className="absolute inset-0 rounded-full border-2 border-t-accent-500 dark:border-t-accent-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
      </div>
      <p className="text-[12px] font-medium text-ink-400 dark:text-ink-500 uppercase tracking-widest animate-pulse">
        Loading...
      </p>
    </div>
  )
}
