# Backend URL Connect — Design Spec
**Date:** 2026-05-14  
**Status:** Approved

## Problem

Trace Explorer and Studio pages currently require `SPRING_BOOT_URL` to be baked in as a server-side env var. Users who run their own Spring Boot instance (local or deployed) have no way to point the frontend at it without a redeployment. Pages silently fall back to mock data with no explanation.

## Goal

Let authenticated users enter their own Spring Boot URL directly in the UI. The URL is validated server-side before saving and persisted to their account so they don't need to re-enter it. Users without a backend can navigate to a sandbox placeholder page.

---

## Data Layer

### Schema change
Add `backendUrl TEXT` (nullable, default null) to the `users` table.

**File:** `api/db/schema.ts`
```ts
backendUrl: text('backend_url'),
```

**Migration:** new Drizzle migration file under `api/db/migrations/`.

---

## API Changes

### `GET /api/me` (extend existing)
Add `backendUrl: string | null` to the response shape.

**File:** `api/routes/me.ts`

### `PATCH /api/me` (new)
Saves `backendUrl` to the user record.

- **Body:** `{ backendUrl: string | null }` — null clears it
- **Validation:** Zod — must be a valid URL (`z.string().url()`) or null
- **Auth:** requires session (already enforced in me.ts)
- **Response:** `{ backendUrl: string | null }`

### `POST /api/me/backend/test` (new)
Tests whether a given URL points to a reachable TraceGraph Spring Boot instance. Done server-side to avoid CORS issues (works for localhost URLs too).

- **Body:** `{ url: string }`
- **Validation:** Zod — must be a valid URL
- **Logic:** `GET {url}/tracegraph/traces` with a 5-second AbortController timeout, Authorization header set to the user's internal JWT
- **Response:**
  - `{ ok: true }` on 200–299
  - `{ ok: false, error: "Connection refused" }` on network error
  - `{ ok: false, error: "URL unreachable" }` on timeout
  - `{ ok: false, error: "Unexpected response" }` on non-2xx
- **Auth:** requires session

---

## Frontend

### `AuthContext` / `AuthProvider`
`backendUrl` added to `AuthUser` type and returned by `GET /api/me`. `AuthProvider` already fetches `/api/me` — no structural change needed, just extend the type and pass it through context.

**Files:**
- `src/contexts/authContext.ts` — add `backendUrl: string | null` to `AuthUser`
- `src/contexts/AuthProvider.tsx` — no logic change needed

### `useBackendUrl` hook
**File:** `src/hooks/useBackendUrl.ts`

```ts
interface UseBackendUrl {
  backendUrl: string | null
  testing: boolean
  saving: boolean
  error: string | null
  test: (url: string) => Promise<{ ok: boolean; error?: string }>
  save: (url: string | null) => Promise<void>
}
```

- `test(url)` — POST to `/api/me/backend/test`, returns result
- `save(url)` — PATCH to `/api/me` with `{ backendUrl: url }`, then calls `refresh()` from `AuthContext` to sync the new value into context
- `clear()` — calls `save(null)`

### Empty state component
**File:** `src/components/BackendConnect.tsx`

Rendered when `backendUrl === null`. Contains:
1. A heading: "Connect your TraceGraph backend"
2. A short description: "Enter the URL of your running Spring Boot instance"
3. URL input (`type="url"`, placeholder `http://localhost:8082`)
4. "Connect" button — triggers `test()` then `save()` on success
5. Status feedback inline: spinner during test, green message on success, red error on failure
6. Divider "or"
7. "Try Sandbox" button → `navigate('/sandbox')`

Uses existing `Button`, `Icon` components and `ink-*` colour palette. No new design tokens.

### Connected indicator
Both Trace Explorer and Studio show a small pill in their page header when `backendUrl` is set:
```
● localhost:8082  ×
```
Clicking `×` calls `save(null)` to disconnect and returns to the empty state.

### Page integration
**Files:** `src/pages/TraceExplorer.tsx`, `src/pages/Studio.tsx`

At the top of each page's render:
```tsx
const { backendUrl } = useBackendUrl()
if (!backendUrl) return <BackendConnect />
```

The rest of the existing page logic is unchanged.

### `/sandbox` placeholder page
**File:** `src/pages/Sandbox.tsx`

Simple page using standard layout. Content:
- Heading: "Sandbox"
- Body: "Interactive sandbox coming soon. Run TraceGraph workflows directly in the browser without a backend."
- A "Back" link to `/trace`

Lazy-loaded in `App.tsx`:
```tsx
const Sandbox = lazy(() => import('@/pages/Sandbox').then(m => ({ default: m.Sandbox })))
```

Route: `<Route path="/sandbox" element={<Sandbox />} />`  
No auth gate — publicly accessible.

---

## Error handling

| Scenario | Behaviour |
|---|---|
| URL is not a valid URL | Zod rejects before fetch, inline validation message |
| Backend unreachable (timeout) | `{ ok: false, error: "URL unreachable" }` shown inline |
| Backend reachable but not TraceGraph | `{ ok: false, error: "Unexpected response" }` shown inline |
| Save fails (network error) | Toast or inline error, backendUrl not updated in context |
| User clears URL | `backendUrl` set to null, empty state shown immediately |

---

## Files changed

| File | Change |
|---|---|
| `api/db/schema.ts` | Add `backendUrl` column |
| `api/db/migrations/` | New migration file |
| `api/routes/me.ts` | Extend GET, add PATCH, add POST /backend/test |
| `src/contexts/authContext.ts` | Add `backendUrl` to `AuthUser` |
| `src/hooks/useBackendUrl.ts` | New hook |
| `src/components/BackendConnect.tsx` | New empty state component |
| `src/components/index.ts` | Export `BackendConnect` |
| `src/pages/TraceExplorer.tsx` | Add empty state guard |
| `src/pages/Studio.tsx` | Add empty state guard |
| `src/pages/Sandbox.tsx` | New placeholder page |
| `src/App.tsx` | Add `/sandbox` route |

---

## Out of scope

- Multiple saved backends per user
- Sandbox implementation (page is a placeholder only)
- Backend health polling / auto-reconnect
