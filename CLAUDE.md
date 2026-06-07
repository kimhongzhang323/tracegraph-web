# TraceGraph Web — Claude Instructions

## Project Overview

TraceGraph is a typed execution-graph runtime for the JVM. This repo is **three tiers**:
the React frontend (`src/`), a Node backend-for-frontend (`api/`, Hono on Vercel
Functions) that owns auth and proxies data, and the Spring Boot runtime (separate
repo: `TraceGraph`). The browser never calls Spring Boot directly — it goes through
the BFF, which authenticates the session and forwards trace calls with a minted
Ed25519 JWT. See `README.md` → Architecture for the full picture.

## Tech Stack

| Layer | Library |
|-------|---------|
| Framework | React 18 + Vite 6 |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v3 (custom `ink-*` palette) |
| Routing | React Router v6 |
| Graph rendering | `@xyflow/react` + `d3-force` |
| Icons | `lucide-react` |
| BFF | Hono · Neon Postgres + Drizzle · `jose` (JWT) · Upstash · Resend |
| Auth | Custom (`/api/auth/*`) — sessions, OAuth, magic links, TOTP MFA, passkeys |

## Repository Layout

```
src/             # React SPA (browser)
  pages/         # Route-level components (lazy-loaded)
  components/    # Shared UI primitives
  hooks/         # Custom React hooks
  contexts/      # Auth context + AuthProvider
  lib/           # API client, utilities
  types/         # Shared TypeScript types
  data/          # Mock/seed data

api/             # Node BFF (Hono) — auth + proxy to Spring Boot
  middleware/    # cors, securityHeaders, session, csrf, requestSize
  routes/        # auth/*, me.ts, proxy.ts
  lib/           # jwt, argon2, mfa, webauthn, oauth, email, ratelimit…
  db/            # Drizzle schema + migrations (Neon Postgres)
```

## Path Alias

`@/` maps to `src/`. Always use `@/` imports, never relative `../` chains.

## Key Conventions

- All pages are **lazy-loaded** via `React.lazy` in `App.tsx`.
- Auth-gated pages wrap in `<ProtectedRoute>` — do not add auth checks inside page components.
- Theme is managed by `useTheme` hook; persist to localStorage only through that hook.
- Tests: Vitest (unit) + Playwright (e2e). E2E mocks all API calls — no backend required.
- Keep components under ~150 lines; extract subcomponents or hooks when they grow larger.

## Environment Variables

`VITE_*` vars reach the browser; everything else is read by the BFF only.

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | BFF origin (empty = same-origin, recommended) |
| `VITE_SITE_URL` | Canonical origin for SEO |
| `DATABASE_URL` | Neon Postgres (users, sessions, MFA) |
| `SESSION_SECRET` | Session cookie signing |
| `SPRING_BOOT_URL` | Upstream backend the proxy forwards to |

See `.env.example` for the full list (OAuth, Resend, Upstash, JWT keys, WebAuthn).
Copy `.env.example` → `.env.local` and fill in values.

## Dev Commands

```bash
npm run dev       # Start Vite dev server at :5173
npm run dev:api   # Start Hono BFF at :3000 (Vite proxies /api/* here)
npm run build     # Type-check + production build
npm run lint      # ESLint (zero warnings policy)
npm run format    # Prettier format
npm run test      # Vitest unit tests
npm run test:e2e  # Playwright e2e tests
```

## Backend API

The browser calls the BFF, not Spring Boot directly. The BFF authenticates the
session and proxies `/api/traces/*` → `/tracegraph/traces/*` with a minted Ed25519
JWT (`api/routes/proxy.ts`). The frontend client is `src/lib/api.ts`; the API
reference page (`/api`) documents the contract.

## Rules

Path-scoped rules live in `.claude/rules/`:
- `frontend.md` — React/Vite/TypeScript conventions
- `backend.md` — Backend API integration
- `testing.md` — Testing approach
