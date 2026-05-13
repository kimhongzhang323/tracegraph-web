# Backend Integration Rules

Applies to: `src/lib/api.ts`, `src/hooks/use*.ts`

## API Client

- All HTTP calls go through `src/lib/api.ts` — do not use `fetch` or `axios` directly in components or pages.
- Base URL comes from `import.meta.env.VITE_API_BASE_URL` (empty string = relative URLs, used when Spring Boot serves the frontend).
- Throw errors with meaningful messages; let calling hooks handle display logic.

## Data Fetching

- Use custom hooks in `src/hooks/` to encapsulate fetch logic — pages should not call `api.ts` directly.
- For live/streaming data (traces), use `useLiveTraces` as the pattern reference.

## Backend Repo

The Spring Boot backend lives in a separate repo (`TraceGraph`). Key endpoints:
- `GET /api/traces` — list traces
- `GET /api/traces/{id}` — trace detail
- `POST /api/traces/{id}/replay` — replay a trace

Always check `src/pages/ApiReference.tsx` for the current documented contract before assuming an endpoint exists.
