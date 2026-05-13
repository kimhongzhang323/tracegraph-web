# TraceGraph Web — Claude Instructions

## Project Overview

TraceGraph is a typed execution-graph runtime for the JVM. This repo is the **React frontend** only — it talks to a Spring Boot backend (separate repo: `TraceGraph`).

## Tech Stack

| Layer | Library |
|-------|---------|
| Framework | React 18 + Vite 6 |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v3 (custom `ink-*` palette) |
| Auth | Clerk (`@clerk/clerk-react`) |
| Routing | React Router v6 |
| Graph rendering | `@xyflow/react` + `d3-force` |
| Icons | `lucide-react` |

## Repository Layout

```
src/
  pages/         # Route-level components (lazy-loaded)
  components/    # Shared UI primitives
  hooks/         # Custom React hooks
  lib/           # API client, utilities
  types/         # Shared TypeScript types
  data/          # Mock/seed data
```

## Path Alias

`@/` maps to `src/`. Always use `@/` imports, never relative `../` chains.

## Key Conventions

- All pages are **lazy-loaded** via `React.lazy` in `App.tsx`.
- Auth-gated pages wrap in `<ProtectedRoute>` — do not add auth checks inside page components.
- Theme is managed by `useTheme` hook; persist to localStorage only through that hook.
- No test framework is set up — manual testing in browser is the current approach.
- Keep components under ~150 lines; extract subcomponents or hooks when they grow larger.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Backend URL (empty = relative, for when served by Spring Boot) |
| `VITE_SITE_URL` | Canonical origin for SEO |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk auth key |

Copy `.env.example` → `.env.local` and fill in values.

## Dev Commands

```bash
npm run dev       # Start Vite dev server at :5173
npm run build     # Type-check + production build
npm run lint      # ESLint (zero warnings policy)
npm run format    # Prettier format
```

## Backend API

The Spring Boot backend exposes REST endpoints under `/api`. See `src/lib/api.ts` for the current client. The API reference page (`/api`) documents the contract.

## Rules

Path-scoped rules live in `.claude/rules/`:
- `frontend.md` — React/Vite/TypeScript conventions
- `backend.md` — Backend API integration
- `testing.md` — Testing approach
