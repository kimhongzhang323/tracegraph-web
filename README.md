# TraceGraph Web

The React frontend for **TraceGraph** — a typed execution-graph runtime for the JVM. This app gives developers visibility into graph-based agent programs: inspect execution traces, replay from any step, compare divergent runs, and explore graph topology interactively.

**Live:** [tracegraph.site](https://www.tracegraph.site)

---

## Features

- **Trace Explorer** — step-by-step execution timeline with state before/after diffs, live event streaming, and side-by-side comparison of two traces
- **Replay & Fork** — re-run any trace from an arbitrary checkpoint; view the exact state at each step
- **Graph Studio** — interactive canvas (topology, relations, execution lenses) with complexity metrics and export to Mermaid/PlantUML
- **API Reference** — browsable REST documentation for the Spring Boot backend
- **Authentication** — email/password, Google & GitHub OAuth, magic links, TOTP-based MFA, and WebAuthn passkeys
- **Dark mode** — class-based, persisted per-device

---

## Tech Stack

| Concern | Library |
|---------|---------|
| Framework | React 18 + Vite 6 |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v3 (custom `ink-*` palette) |
| Routing | React Router v6 |
| Graph rendering | `@xyflow/react` + `d3-force` |
| Icons | `lucide-react` |
| Auth | Custom (`/api/auth/*`) + `@simplewebauthn/browser` |
| Testing | Vitest · Playwright · React Testing Library |

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

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | No | Backend URL. Leave empty when served by Spring Boot on the same origin. |
| `VITE_SITE_URL` | No | Canonical origin for SEO (e.g. `https://www.tracegraph.site`). |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key for auth UI. |
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
npm run build     # Type-check + production build
npm run lint      # ESLint (zero warnings)
npm run format    # Prettier
```

---

## Project Structure

```
src/
  pages/        # Route-level components (lazy-loaded)
  components/   # Shared UI primitives
  hooks/        # useTheme, useSession, useLiveTraces, useBackendUrl
  contexts/     # Auth context
  lib/          # API client (api.ts), auth helpers, utilities
  types/        # Shared TypeScript types
  data/         # Mock/seed data for demo mode
```

All pages are lazy-loaded via `React.lazy`. Auth-gated routes use `<ProtectedRoute>` — auth checks live in context, not in page components.

---

## Routes

| Path | Auth | Description |
|------|------|-------------|
| `/` | Public | Landing page |
| `/trace` | Protected | Trace Explorer |
| `/studio` | Protected | Graph Studio |
| `/docs` | Public | Documentation |
| `/api` | Public | API Reference |
| `/changelog` | Public | Release notes |
| `/account` | Protected | User account & MFA |
| `/sign-in`, `/sign-up` | Public | Auth flows |

---

## Backend

This frontend talks to a Spring Boot backend. Key endpoints:

```
GET    /api/traces          list traces
GET    /api/traces/:id      trace detail
POST   /api/traces/:id/replay  replay / fork from step
```

See `src/pages/ApiReference.tsx` for the full documented contract, or visit `/api` in the running app.

The API client (`src/lib/api.ts`) handles CSRF token injection, request deduplication, and relative vs. absolute base URL configuration.

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
