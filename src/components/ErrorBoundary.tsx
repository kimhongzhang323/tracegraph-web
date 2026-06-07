import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)

    // Detect chunk load errors
    const isChunkError =
      error.name === 'ChunkLoadError' ||
      /loading chunk/i.test(error.message) ||
      /failed to fetch dynamically imported module/i.test(error.message)

    if (isChunkError) {
      const hasReloaded = sessionStorage.getItem('tg-chunk-reloaded')
      if (!hasReloaded) {
        sessionStorage.setItem('tg-chunk-reloaded', 'true')
        window.location.reload()
      }
    }
  }

  public componentDidMount() {
    // If we mount successfully without errors, reset the reload flag
    if (!this.state.hasError) {
      sessionStorage.removeItem('tg-chunk-reloaded')
    }
  }

  private handleReload = () => {
    sessionStorage.removeItem('tg-chunk-reloaded')
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.name === 'ChunkLoadError' ||
        /loading chunk/i.test(this.state.error?.message ?? '') ||
        /failed to fetch dynamically imported module/i.test(this.state.error?.message ?? '')

      return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-ink-950 p-6">
          <div className="max-w-md w-full bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl shadow-sm p-8 text-center fade-up">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-5 text-red-600 dark:text-red-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className="display-tight text-xl text-ink-950 dark:text-white mb-2">
              {isChunkError ? 'Application Update' : 'Something went wrong'}
            </h1>
            <p className="text-[13px] text-ink-500 mb-6 leading-relaxed">
              {isChunkError
                ? 'A new version of the app has been deployed. Please reload to load the latest version.'
                : 'An unexpected error occurred while rendering this page.'}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={this.handleReload}
                className="w-full h-10 rounded-xl bg-ink-950 dark:bg-white text-white dark:text-ink-950 text-[13px] font-medium tracking-[-0.01em] hover:bg-ink-800 dark:hover:bg-ink-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/40 dark:focus-visible:ring-white/40"
              >
                Reload App
              </button>
              <a
                href="/"
                className="w-full h-10 rounded-xl border border-ink-200 dark:border-ink-800 flex items-center justify-center text-[13px] text-ink-700 dark:text-ink-300 font-medium hover:bg-ink-50 dark:hover:bg-ink-900 transition-colors"
              >
                Go to Home
              </a>
            </div>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <pre className="mt-6 p-4 rounded-xl bg-ink-50 dark:bg-ink-950 text-left text-[11px] text-red-600 dark:text-red-400 overflow-x-auto max-h-40 border border-ink-100 dark:border-ink-800 scroll-thin">
                {this.state.error.stack || this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
