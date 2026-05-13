# Backend URL Connect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authenticated users enter their own Spring Boot URL in the Trace Explorer and Studio pages, validate it server-side, persist it to their account, and navigate to a sandbox placeholder when they have no backend.

**Architecture:** Add `backend_url` to the `users` table. Extend `GET /api/me` to return it, add `PATCH /api/me` to save it, and add `POST /api/me/backend/test` to ping it server-side. On the frontend a `useBackendUrl` hook reads/writes this value; both pages render a `<BackendConnect>` empty state when null.

**Tech Stack:** Drizzle ORM + Neon Postgres, Hono, React 18, TypeScript strict, Tailwind ink-* palette, existing `Button`/`Icon` components.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `api/db/schema.ts` | Modify | Add `backendUrl` column to `users` |
| `api/db/migrations/0001_backend_url.sql` | Create | Raw SQL migration |
| `api/routes/me.ts` | Modify | Add `backendUrl` to GET, add PATCH, add POST /backend/test |
| `src/contexts/authContext.ts` | Modify | Add `backendUrl: string \| null` to `AuthUser` |
| `src/contexts/AuthProvider.tsx` | Modify | Fetch `backendUrl` from `/api/me` and pass through |
| `src/hooks/useBackendUrl.ts` | Create | test/save/clear logic wrapping API calls |
| `src/components/BackendConnect.tsx` | Create | Empty state UI with URL input + sandbox button |
| `src/components/index.ts` | Modify | Export `BackendConnect` |
| `src/pages/Sandbox.tsx` | Create | Placeholder page |
| `src/pages/TraceExplorer.tsx` | Modify | Guard with `<BackendConnect>` when no URL |
| `src/pages/Studio.tsx` | Modify | Guard with `<BackendConnect>` when no URL |
| `src/App.tsx` | Modify | Add `/sandbox` route |

---

## Task 1: Add `backend_url` column to schema + migration

**Files:**
- Modify: `api/db/schema.ts`
- Create: `api/db/migrations/0001_backend_url.sql`

- [ ] **Step 1: Add the column to the Drizzle schema**

In `api/db/schema.ts`, add `backendUrl` to the `users` table after `disabledAt`:

```ts
export const users = pgTable('users', {
  id,
  email: text('email').notNull().unique(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  passwordHash: text('password_hash'),
  mfaEnabled: boolean('mfa_enabled').notNull().default(false),
  mfaSecretEnc: text('mfa_secret_enc'),
  createdAt,
  updatedAt,
  disabledAt: timestamp('disabled_at', { withTimezone: true }),
  backendUrl: text('backend_url'),
})
```

- [ ] **Step 2: Write the migration SQL**

Create `api/db/migrations/0001_backend_url.sql`:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS backend_url TEXT;
```

- [ ] **Step 3: Run the migration against your database**

```bash
npx dotenv -e .env.local -- npx drizzle-kit push
```

Expected output: `[✓] Changes applied` (or similar). No error about missing column.

- [ ] **Step 4: Commit**

```bash
git add api/db/schema.ts api/db/migrations/0001_backend_url.sql
git commit -m "feat: add backend_url column to users table"
```

---

## Task 2: Extend `GET /api/me` + add `PATCH /api/me` + add `POST /api/me/backend/test`

**Files:**
- Modify: `api/routes/me.ts`

- [ ] **Step 1: Update the GET `/` handler to fetch and return `backendUrl`**

Replace the current `meRouter.get('/')` handler. It needs to query the DB for `backendUrl` since the session middleware only stores `userId`, `email`, and `mfaEnabled`.

```ts
import { Hono } from 'hono'
import { requireAuth } from '../middleware/session.js'
import { db, sessions, passkeys, users } from '../db/index.js'
import { eq, and, gt, isNull } from 'drizzle-orm'
import { z } from 'zod'

export const meRouter = new Hono()

meRouter.get('/', async (c) => {
  const session = requireAuth(c)
  const [user] = await db
    .select({ backendUrl: users.backendUrl })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1)
  return c.json({
    id: session.userId,
    email: session.email,
    mfaEnabled: session.mfaEnabled,
    backendUrl: user?.backendUrl ?? null,
  })
})
```

- [ ] **Step 2: Add `PATCH /` to save backendUrl**

Append after the GET handler:

```ts
const patchMeSchema = z.object({
  backendUrl: z.string().url().max(2048).nullable(),
})

meRouter.patch('/', async (c) => {
  const session = requireAuth(c)
  const body = await c.req.json()
  const parsed = patchMeSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, 400)
  }
  await db
    .update(users)
    .set({ backendUrl: parsed.data.backendUrl })
    .where(eq(users.id, session.userId))
  return c.json({ backendUrl: parsed.data.backendUrl })
})
```

- [ ] **Step 3: Add `POST /backend/test` to ping the user's URL server-side**

Append after the PATCH handler:

```ts
const testBackendSchema = z.object({
  url: z.string().url().max(2048),
})

meRouter.post('/backend/test', async (c) => {
  const session = requireAuth(c)
  const body = await c.req.json()
  const parsed = testBackendSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ ok: false, error: 'Invalid URL' }, 400)
  }

  const testUrl = `${parsed.data.url.replace(/\/$/, '')}/tracegraph/traces?limit=1`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5_000)

  try {
    const res = await fetch(testUrl, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    })
    clearTimeout(timer)
    if (res.ok || res.status === 401) {
      // 401 means Spring Boot is running but rejected our (missing) JWT — that's fine
      return c.json({ ok: true })
    }
    return c.json({ ok: false, error: 'Unexpected response' })
  } catch (err) {
    clearTimeout(timer)
    const e = err as Error
    if (e.name === 'AbortError') return c.json({ ok: false, error: 'URL unreachable (timeout)' })
    return c.json({ ok: false, error: 'Connection refused' })
  }
})
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add api/routes/me.ts
git commit -m "feat: extend /api/me with backendUrl, PATCH, and backend/test endpoints"
```

---

## Task 3: Update `AuthContext` and `AuthProvider`

**Files:**
- Modify: `src/contexts/authContext.ts`
- Modify: `src/contexts/AuthProvider.tsx`

- [ ] **Step 1: Add `backendUrl` to `AuthUser`**

In `src/contexts/authContext.ts`, update `AuthUser`:

```ts
export interface AuthUser {
  id: string
  email: string
  mfaEnabled: boolean
  backendUrl: string | null
}
```

No other changes needed — `AuthContext`, `AuthContextValue`, and `useAuth` are unchanged.

- [ ] **Step 2: Verify `AuthProvider` passes through `backendUrl` automatically**

`AuthProvider` already does `setUser(await res.json())` — since the API now returns `backendUrl`, it will flow through automatically. No logic change needed.

Open `src/contexts/AuthProvider.tsx` and confirm line 11 reads:
```ts
setUser(await res.json())
```
If it does, no change is needed. If it destructures specific fields, add `backendUrl`.

- [ ] **Step 3: Check TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors (the extra field is now part of `AuthUser`).

- [ ] **Step 4: Commit**

```bash
git add src/contexts/authContext.ts
git commit -m "feat: add backendUrl to AuthUser type"
```

---

## Task 4: Create `useBackendUrl` hook

**Files:**
- Create: `src/hooks/useBackendUrl.ts`

- [ ] **Step 1: Write the hook**

Create `src/hooks/useBackendUrl.ts`:

```ts
import { useState } from 'react'
import { useAuth } from '@/contexts/authContext'

interface UseBackendUrl {
  backendUrl: string | null
  testing: boolean
  saving: boolean
  error: string | null
  test: (url: string) => Promise<{ ok: boolean; error?: string }>
  save: (url: string | null) => Promise<void>
  clear: () => Promise<void>
}

export function useBackendUrl(): UseBackendUrl {
  const { user, refresh } = useAuth()
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function test(url: string): Promise<{ ok: boolean; error?: string }> {
    setTesting(true)
    setError(null)
    try {
      const res = await fetch('/api/me/backend/test', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json() as { ok: boolean; error?: string }
      if (!data.ok) setError(data.error ?? 'Connection failed')
      return data
    } catch {
      const msg = 'Request failed'
      setError(msg)
      return { ok: false, error: msg }
    } finally {
      setTesting(false)
    }
  }

  async function save(url: string | null): Promise<void> {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backendUrl: url }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Save failed')
      }
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function clear(): Promise<void> {
    return save(null)
  }

  return {
    backendUrl: user?.backendUrl ?? null,
    testing,
    saving,
    error,
    test,
    save,
    clear,
  }
}
```

- [ ] **Step 2: Write unit tests**

Create `src/hooks/useBackendUrl.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'

const mockRefresh = vi.fn()
vi.mock('@/contexts/authContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'a@b.com', mfaEnabled: false, backendUrl: 'http://localhost:8082' },
    refresh: mockRefresh,
  }),
}))

const { useBackendUrl } = await import('./useBackendUrl')

describe('useBackendUrl', () => {
  beforeEach(() => { mockRefresh.mockResolvedValue(undefined) })

  it('returns backendUrl from auth context', () => {
    const { result } = renderHook(() => useBackendUrl())
    expect(result.current.backendUrl).toBe('http://localhost:8082')
  })

  it('test() returns ok:true on success', async () => {
    server.use(
      http.post('http://localhost/api/me/backend/test', () =>
        HttpResponse.json({ ok: true }),
      ),
    )
    const { result } = renderHook(() => useBackendUrl())
    let res: { ok: boolean; error?: string }
    await act(async () => { res = await result.current.test('http://localhost:8082') })
    expect(res!.ok).toBe(true)
  })

  it('test() sets error on failure', async () => {
    server.use(
      http.post('http://localhost/api/me/backend/test', () =>
        HttpResponse.json({ ok: false, error: 'Connection refused' }),
      ),
    )
    const { result } = renderHook(() => useBackendUrl())
    await act(async () => { await result.current.test('http://bad-url') })
    expect(result.current.error).toBe('Connection refused')
  })

  it('save() calls PATCH and refreshes auth', async () => {
    server.use(
      http.patch('http://localhost/api/me', () =>
        HttpResponse.json({ backendUrl: 'http://new:8082' }),
      ),
    )
    const { result } = renderHook(() => useBackendUrl())
    await act(async () => { await result.current.save('http://new:8082') })
    expect(mockRefresh).toHaveBeenCalledOnce()
  })

  it('clear() saves null', async () => {
    let capturedBody: unknown
    server.use(
      http.patch('http://localhost/api/me', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ backendUrl: null })
      }),
    )
    const { result } = renderHook(() => useBackendUrl())
    await act(async () => { await result.current.clear() })
    expect((capturedBody as { backendUrl: unknown }).backendUrl).toBeNull()
  })
})
```

- [ ] **Step 3: Run the tests**

```bash
npm run test -- src/hooks/useBackendUrl
```

Expected: 4 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useBackendUrl.ts src/hooks/useBackendUrl.test.ts
git commit -m "feat: add useBackendUrl hook with test/save/clear"
```

---

## Task 5: Create `BackendConnect` component

**Files:**
- Create: `src/components/BackendConnect.tsx`
- Modify: `src/components/index.ts`

- [ ] **Step 1: Create the component**

Create `src/components/BackendConnect.tsx`:

```tsx
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
        {/* Icon */}
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

        {/* URL input row */}
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

        {/* Feedback */}
        {error && (
          <p className="text-[12px] text-red-600 dark:text-red-400 mb-3">{error}</p>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-ink-100 dark:bg-ink-800" />
          <span className="text-[11px] text-ink-400 font-medium uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-ink-100 dark:bg-ink-800" />
        </div>

        {/* Sandbox */}
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
```

- [ ] **Step 2: Export from components index**

In `src/components/index.ts`, add:

```ts
export { BackendConnect } from './BackendConnect'
```

- [ ] **Step 3: Write a smoke test**

Create `src/components/BackendConnect.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/hooks/useBackendUrl', () => ({
  useBackendUrl: () => ({
    backendUrl: null,
    testing: false,
    saving: false,
    error: null,
    test: vi.fn().mockResolvedValue({ ok: true }),
    save: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn(),
  }),
}))

const { BackendConnect } = await import('./BackendConnect')

describe('BackendConnect', () => {
  it('renders URL input and Connect button', () => {
    render(<MemoryRouter><BackendConnect /></MemoryRouter>)
    expect(screen.getByPlaceholderText('http://localhost:8082')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument()
  })

  it('renders Try Sandbox mode button', () => {
    render(<MemoryRouter><BackendConnect /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Try Sandbox mode' })).toBeInTheDocument()
  })

  it('Connect button is disabled when input is empty', () => {
    render(<MemoryRouter><BackendConnect /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Connect' })).toBeDisabled()
  })
})
```

- [ ] **Step 4: Run the tests**

```bash
npm run test -- src/components/BackendConnect
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/BackendConnect.tsx src/components/BackendConnect.test.tsx src/components/index.ts
git commit -m "feat: add BackendConnect empty state component"
```

---

## Task 6: Create `/sandbox` placeholder page + route

**Files:**
- Create: `src/pages/Sandbox.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the Sandbox page**

Create `src/pages/Sandbox.tsx`:

```tsx
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
```

- [ ] **Step 2: Add the route and lazy import to `App.tsx`**

In `src/App.tsx`, add the lazy import after the existing ones:

```tsx
const Sandbox = lazy(() => import('@/pages/Sandbox').then((m) => ({ default: m.Sandbox })))
```

Add the route inside `<Routes>` after the `/account` route:

```tsx
<Route path="/sandbox" element={<Sandbox />} />
```

- [ ] **Step 3: Verify lint + build**

```bash
npm run lint && npm run build
```

Expected: zero warnings, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Sandbox.tsx src/App.tsx
git commit -m "feat: add /sandbox placeholder page"
```

---

## Task 7: Guard TraceExplorer and Studio with `BackendConnect`

**Files:**
- Modify: `src/pages/TraceExplorer.tsx`
- Modify: `src/pages/Studio.tsx`

- [ ] **Step 1: Add the guard to TraceExplorer**

At the top of `src/pages/TraceExplorer.tsx`, add the import:

```tsx
import { useBackendUrl } from '@/hooks/useBackendUrl'
import { BackendConnect } from '@/components'
```

Inside the `TraceExplorer` component function, add the guard as the **first thing after any hook calls**:

```tsx
export function TraceExplorer() {
  const { backendUrl, clear } = useBackendUrl()
  // ... existing state hooks ...

  if (!backendUrl) return <BackendConnect />

  // ... rest of existing JSX ...
}
```

Also add the connected indicator just inside the page's top bar. Find the existing header area and append a small pill:

```tsx
{/* Connected indicator — add near the existing page title */}
<div className="flex items-center gap-2">
  <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-400">
    <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
    {backendUrl}
  </span>
  <button
    onClick={clear}
    className="text-[11px] text-ink-400 hover:text-ink-700 dark:hover:text-ink-300 transition-colors"
    title="Disconnect"
  >
    ×
  </button>
</div>
```

- [ ] **Step 2: Add the guard to Studio**

Same pattern. At the top of `src/pages/Studio.tsx`, add:

```tsx
import { useBackendUrl } from '@/hooks/useBackendUrl'
import { BackendConnect } from '@/components'
```

Inside the `Studio` component function, add:

```tsx
export function Studio() {
  const { backendUrl, clear } = useBackendUrl()
  // ... existing state hooks ...

  if (!backendUrl) return <BackendConnect />

  // ... rest of existing JSX ...
}
```

Add the same connected indicator pill near the Studio page's existing header controls.

- [ ] **Step 3: Verify TypeScript + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: zero errors, zero warnings.

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: all tests pass (32 existing + new ones from Tasks 4 and 5).

- [ ] **Step 5: Commit**

```bash
git add src/pages/TraceExplorer.tsx src/pages/Studio.tsx
git commit -m "feat: guard TraceExplorer and Studio with BackendConnect empty state"
```

---

## Task 8: Final verification + push

- [ ] **Step 1: Full build check**

```bash
npm run build
```

Expected: builds with no errors, no type errors.

- [ ] **Step 2: Run full test suite**

```bash
npm run test:coverage
```

Expected: all tests pass, coverage ≥ 70% on lib/hooks/components.

- [ ] **Step 3: Push branch and update PR**

```bash
git push
```

The existing PR #3 will pick up the new commits automatically.
