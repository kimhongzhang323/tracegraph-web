# TraceGraph Web

The React frontend for **TraceGraph** — a typed execution-graph runtime for the JVM. This app gives developers visibility into graph-based agent programs: inspect execution traces, replay from any step, compare divergent runs, and explore graph topology interactively.

**Live:** [tracegraph.site](https://www.tracegraph.site)

---

## Features

- **Trace Explorer** — step-by-step execution timeline with state before/after diffs, live event streaming, and side-by-side comparison of two traces
- **Replay & Fork** — re-run any trace from an arbitrary checkpoint; view the exact state at each step
- **Graph Studio** — interactive canvas (topology, relations, execution lenses) with complexity metrics and export to Mermaid/PlantUML
- **Sandbox** — a self-contained, in-browser runtime simulation: run/replay/fork presets, inject failures, and inspect state — no backend required
- **API Reference** — browsable REST documentation for the Spring Boot backend
- **Authentication** — email/password, Google & GitHub OAuth, magic links, TOTP-based MFA, and WebAuthn passkeys
- **Dark mode** — class-based, persisted per-device

---

## Tech Stack

**Frontend (browser)**

| Concern | Library |
|---------|---------|
| Framework | React 18 + Vite 6 |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v3 (custom `ink-*` palette) |
| Routing | React Router v6 |
| Graph rendering | `@xyflow/react` + `d3-force` |
| Icons | `lucide-react` |
| Passkeys | `@simplewebauthn/browser` |

**API / backend-for-frontend (`api/`)**

| Concern | Library |
|---------|---------|
| HTTP framework | Hono (deployed as Vercel Functions) |
| Database | Neon Postgres + Drizzle ORM |
| Sessions & CSRF | Signed `__Host-*` cookies |
| Password hashing | Argon2 (`@node-rs/argon2`) |
| MFA / passkeys | `otpauth` (TOTP) · `@simplewebauthn/server` |
| Internal auth | Ed25519 JWT (`jose`) → Spring Boot |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`) |
| Email | Resend (magic links, verification) |
| Validation | Zod |

**Tooling** — Vitest · Playwright · React Testing Library · MSW · ESLint · Prettier

---

## Architecture

TraceGraph Web is **three tiers**. The browser never talks to the Spring Boot
runtime directly — every request goes through a Node backend-for-frontend (BFF)
that owns authentication and proxies data calls with a signed service token.

```
┌──────────────────────┐     ┌───────────────────────────────┐     ┌──────────────────────┐
│  React SPA (src/)     │     │  Node BFF — Hono (api/)       │     │  Spring Boot          │
│  Vite static bundle   │     │  runs as Vercel Functions     │     │  (separate repo)      │
│                       │     │                               │     │                       │
│  • pages / components │ ──▶ │  /api/auth/*  sessions, OAuth │     │  TraceGraph runtime   │
│  • lib/api.ts client  │ XHR │               magic, MFA,     │     │  /tracegraph/traces/* │
│  • AuthProvider       │ SSE │               passkeys        │     │                       │
│  • hooks (useLive...) │     │  /api/me      profile         │     │                       │
│                       │     │  /api/traces  proxy ──────────┼────▶│  (Ed25519 JWT auth)   │
└──────────────────────┘     │     Neon Postgres · Upstash   │     └──────────────────────┘
                             └───────────────────────────────┘
```

**Tier 1 — React SPA (`src/`).** A static Vite bundle. Pages are lazy-loaded in
`App.tsx`; `AuthProvider` (`src/contexts/`) loads the current user from `/api/me`
on mount and gates protected routes via `<ProtectedRoute>`. All HTTP goes through
the single client in `src/lib/api.ts` — no `fetch`/`axios` in components.

**Tier 2 — Node BFF (`api/`).** A Hono app exposing `/api/*`. Its middleware chain
(`api/index.ts`) applies CORS → security headers → session → CSRF → request-size
limits to every request. It is the only tier that holds secrets, talks to the
database (Neon, via Drizzle), and rate-limits (Upstash). It handles **all auth**
locally and **proxies** trace data upstream.

**Tier 3 — Spring Boot (separate `TraceGraph` repo).** The actual typed
execution-graph runtime. It only accepts requests bearing a short-lived Ed25519
JWT minted by the BFF, so it trusts identity without re-implementing login.

### Request flows

**Authentication.** The browser posts to `/api/auth/*` (password, OAuth callback,
magic-link, MFA challenge, passkey). On success the BFF sets a signed
`__Host-session` cookie plus a `__Host-csrf` cookie. `AuthProvider` then calls
`/api/me` to hydrate the user. Mutating requests echo the CSRF token in the
`x-csrf-token` header (handled automatically by `src/lib/api.ts`).

**Trace data.** A call like `api.traces.list()` hits `/api/traces/*` on the BFF.
`api/routes/proxy.ts` requires a valid session, **mints an Ed25519 JWT** for the
user, rewrites the path to `/tracegraph/traces/*`, and forwards it to
`SPRING_BOOT_URL`. Server-sent event streams (live traces) are passed through
unbuffered, so `useLiveTraces` gets real-time updates with auto-reconnect/backoff.

**Demo / offline mode.** When the backend is unreachable, hooks fall back to seed
data in `src/data/` so the UI stays fully explorable. The `/sandbox` route goes
further: a self-contained, in-browser runtime simulation (presets, replay, fork,
failure injection, waterfall) that needs no backend at all.

**Per-user backend override.** Authenticated users can point at their own Spring
Boot instance — `useBackendUrl` saves a `backendUrl` on their profile via
`/api/me`, which the proxy honors per request.

---

## Getting Started

### Prerequisites

- Node.js 20+
- A running instance of the [TraceGraph](https://github.com/your-org/TraceGraph) Spring Boot backend (optional — the app falls back to demo data)

### Install

```bash
git clone https://github.com/your-org/tracegraph-web.git
cd tracegraph-web
npm install
```

### Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

> `VITE_*` vars are read by the browser bundle; everything else is read by the
> Node BFF (`api/`) only and is never shipped to the client.

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | No | BFF origin. Leave empty for same-origin (recommended). |
| `VITE_SITE_URL` | No | Canonical origin for SEO (e.g. `https://www.tracegraph.site`). |
| `DATABASE_URL` | Yes | Neon Postgres connection string (users, sessions, MFA). |
| `SESSION_SECRET` | Yes | 32-character random string for session signing. |
| `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` | No | Google OAuth credentials. |
| `GITHUB_OAUTH_CLIENT_ID` / `_SECRET` | No | GitHub OAuth credentials. |
| `RESEND_API_KEY` / `EMAIL_FROM` | No | Email delivery for magic links and verification. |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | No | Rate limiting via Upstash Redis. |
| `INTERNAL_JWT_PRIVATE_KEY` / `_PUBLIC_KEY` | No | Ed25519 key pair for Node → Spring Boot service tokens. |
| `MFA_ENCRYPTION_KEY` | No | Base64-encoded 32-byte AES-GCM key for TOTP secret storage. |
| `WEBAUTHN_RP_ID` / `WEBAUTHN_ORIGIN` | No | WebAuthn relying party config. |
| `SPRING_BOOT_URL` | No | Backend service URL (default: `http://localhost:8082`). |

### Run

```bash
npm run dev       # Vite dev server at http://localhost:5173
npm run dev:api   # Hono BFF at http://localhost:3000 (Vite proxies /api/* here)
npm run build     # Type-check + production build
npm run lint      # ESLint (zero warnings)
npm run format    # Prettier
```

For a full local stack, run `npm run dev` and `npm run dev:api` together: the
Vite dev server proxies every `/api/*` request to the BFF on port 3000, which in
turn proxies trace data to the Spring Boot backend at `SPRING_BOOT_URL`.

---

## Project Structure

```
src/                  # Tier 1 — React SPA (browser)
  pages/              #   Route-level components (lazy-loaded)
    sandbox/          #   In-browser runtime simulation (the /sandbox demo)
  components/         #   Shared UI primitives
  hooks/              #   useTheme, useSession, useLiveTraces, useBackendUrl
  contexts/           #   Auth context + AuthProvider
  lib/                #   API client (api.ts), auth helpers, utilities
  types/              #   Shared TypeScript types
  data/               #   Mock/seed data for demo mode

api/                  # Tier 2 — Node backend-for-frontend (Hono)
  index.ts            #   App + middleware chain (entry: Vercel Function)
  dev.ts              #   Local dev server (npm run dev:api)
  middleware/         #   cors, securityHeaders, session, csrf, requestSize
  routes/             #   auth/* (password, oauth, magic, passkey, mfa, session)
                      #   me.ts (profile) · proxy.ts (→ Spring Boot)
  lib/                #   jwt, argon2, mfa, webauthn, oauth, email, ratelimit…
  db/                 #   Drizzle schema + migrations (Neon Postgres)
```

All pages are lazy-loaded via `React.lazy`. Auth-gated routes use `<ProtectedRoute>` — auth checks live in context, not in page components.

---

## Routes

| Path | Auth | Description |
|------|------|-------------|
| `/` | Public | Landing page |
| `/trace` | Protected | Trace Explorer |
| `/studio` | Protected | Graph Studio |
| `/sandbox` | Public | In-browser runtime demo (no backend) |
| `/docs` | Public | Documentation |
| `/api` | Public | API Reference |
| `/changelog` | Public | Release notes |
| `/account` | Protected | User account & MFA |
| `/sign-in`, `/sign-up` | Public | Auth flows |

---

## Backend

The browser calls the **BFF**, never Spring Boot directly. The BFF authenticates
the session, then proxies trace endpoints upstream (`/api/traces/*` →
`/tracegraph/traces/*`) with a minted Ed25519 JWT. Key endpoints:

```
GET    /api/traces             list traces
GET    /api/traces/:id         trace detail
POST   /api/traces/:id/replay  replay / fork from step
GET    /api/traces/stream      live event stream (SSE, passed through)
```

See `src/pages/ApiReference.tsx` for the full documented contract, or visit `/api` in the running app.

The client (`src/lib/api.ts`) handles CSRF token injection, in-flight GET
deduplication, request timeouts, and relative-vs-absolute base URL configuration.
The proxy logic lives in `api/routes/proxy.ts`.

---

## Testing

```bash
npm run test          # Vitest unit tests
npm run test:e2e      # Playwright end-to-end tests
npm run test:coverage # Coverage report
```

E2E tests mock all API calls — no backend required.

---

## Contributing

1. Fork the repo and create a feature branch.
2. Run `npm run lint` and `npm run build` — both must pass with zero errors.
3. Test in both light and dark mode.
4. Open a pull request against `master`.

---

## License

Apache 2.0
