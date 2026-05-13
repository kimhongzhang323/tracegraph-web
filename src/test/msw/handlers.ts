import { http, HttpResponse } from 'msw'

// Use absolute URLs — the api client's BASE is set to 'http://localhost' via
// vitest define, so all requests will have this origin in both node and jsdom envs.
const BASE = 'http://localhost'

export const handlers = [
  http.get(`${BASE}/api/me`, () =>
    HttpResponse.json({ id: 'u1', email: 'test@example.com', mfaEnabled: false }),
  ),

  http.get(`${BASE}/api/traces`, () =>
    HttpResponse.json({ items: ['trace-1', 'trace-2'], total: 2 }),
  ),

  http.post(`${BASE}/api/auth/login`, () =>
    HttpResponse.json({ needs_mfa: false }, { status: 200 }),
  ),

  http.post(`${BASE}/api/auth/register`, () =>
    HttpResponse.json({}, { status: 201 }),
  ),
]
