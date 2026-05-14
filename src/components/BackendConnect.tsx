import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBackendUrl } from '@/hooks/useBackendUrl'
import { Button } from './Button'

export function BackendConnect() {
  const navigate = useNavigate()
  const { testing, saving, error, test, save } = useBackendUrl()
  const [url, setUrl] = useState('')
  const [tested, setTested] = useState(false)

  async function handleConnect() {
    setTested(false)
    const result = await test(url)
    if (!result.ok) return
    setTested(true)
    await save(url)
  }

  const busy = testing || saving

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
      <div className="w-full max-w-md">
        <div className="w-10 h-10 rounded-xl bg-ink-100 dark:bg-ink-900 flex items-center justify-center mb-5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink-500">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>

        <h2 className="display-tight text-xl text-ink-950 dark:text-white mb-1">
          Connect your backend
        </h2>
        <p className="text-[13px] text-ink-500 mb-6 leading-relaxed">
          Enter the URL of your running TraceGraph Spring Boot instance.
          This can be a local address or a public URL.
        </p>

        <div className="flex gap-2 mb-3">
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setTested(false) }}
            placeholder="http://localhost:8082"
            disabled={busy}
            className="flex-1 h-10 px-3 rounded-xl border border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-900 text-ink-950 dark:text-white text-[13px] placeholder:text-ink-300 dark:placeholder:text-ink-700 focus:outline-none focus:ring-2 focus:ring-ink-950/10 dark:focus:ring-white/10 disabled:opacity-50 transition-all"
          />
          <Button
            onClick={handleConnect}
            disabled={busy || !url.trim()}
            size="md"
          >
            {testing ? 'Testing…' : saving ? 'Saving…' : tested ? 'Connected ✓' : 'Connect'}
          </Button>
        </div>

        {error && (
          <p className="text-[12px] text-red-600 dark:text-red-400 mb-3">{error}</p>
        )}

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-ink-100 dark:bg-ink-800" />
          <span className="text-[11px] text-ink-400 font-medium uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-ink-100 dark:bg-ink-800" />
        </div>

        <Button
          variant="ghost"
          size="md"
          className="w-full"
          onClick={() => navigate('/sandbox')}
        >
          Try Sandbox mode
        </Button>
      </div>
    </div>
  )
}
