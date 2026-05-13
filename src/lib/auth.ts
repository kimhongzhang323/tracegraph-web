function getCsrfToken(): string {
  return document.cookie.match(/__Host-csrf=([^;]+)/)?.[1] ?? ''
}

async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> ?? {}),
  }
  if (method !== 'GET' && method !== 'HEAD') {
    headers['x-csrf-token'] = getCsrfToken()
  }
  return fetch(url, { ...init, headers, credentials: 'include' })
}

export const auth = {
  register: (email: string, password: string) =>
    authFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),

  login: (email: string, password: string) =>
    authFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  verifyMfa: (code: string) =>
    authFetch('/api/auth/mfa/verify', { method: 'POST', body: JSON.stringify({ code }) }),

  forgotPassword: (email: string) =>
    authFetch('/api/auth/password/forgot', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (token: string, password: string) =>
    authFetch('/api/auth/password/reset', { method: 'POST', body: JSON.stringify({ token, password }) }),

  requestMagicLink: (email: string) =>
    authFetch('/api/auth/magic-link/request', { method: 'POST', body: JSON.stringify({ email }) }),

  passkeyLoginBegin: (email?: string) =>
    authFetch('/api/auth/passkey/login/begin', { method: 'POST', body: JSON.stringify({ email }) }),

  passkeyLoginFinish: (response: unknown) =>
    authFetch('/api/auth/passkey/login/finish', { method: 'POST', body: JSON.stringify(response) }),

  passkeyRegisterBegin: () =>
    authFetch('/api/auth/passkey/register/begin', { method: 'POST' }),

  passkeyRegisterFinish: (response: unknown, deviceLabel?: string) =>
    authFetch('/api/auth/passkey/register/finish', { method: 'POST', body: JSON.stringify({ ...response as object, deviceLabel }) }),

  mfaEnrollBegin: () =>
    authFetch('/api/auth/mfa/enroll/begin', { method: 'POST' }),

  mfaEnrollComplete: (code: string) =>
    authFetch('/api/auth/mfa/enroll/complete', { method: 'POST', body: JSON.stringify({ code }) }),

  logout: () =>
    authFetch('/api/auth/logout', { method: 'POST' }),
}
