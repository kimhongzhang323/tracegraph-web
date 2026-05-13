import type { Context } from 'hono'
import { serialize, parse } from 'cookie'

const SESSION_COOKIE = '__Host-session'
const CSRF_COOKIE = '__Host-csrf'
const SESSION_TTL_DAYS = 14

export function setSessionCookie(c: Context, token: string) {
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 86400 * 1000)
  c.header('Set-Cookie', serialize(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires,
  }))
}

export function setCsrfCookie(c: Context, secret: string) {
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 86400 * 1000)
  c.header('Set-Cookie', serialize(CSRF_COOKIE, secret, {
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires,
  }), { append: true })
}

export function clearAuthCookies(c: Context) {
  c.header('Set-Cookie', serialize(SESSION_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 }))
  c.header('Set-Cookie', serialize(CSRF_COOKIE, '', { secure: true, sameSite: 'lax', path: '/', maxAge: 0 }), { append: true })
}

export function getSessionToken(c: Context): string | undefined {
  const cookies = parse(c.req.header('cookie') ?? '')
  return cookies[SESSION_COOKIE]
}

export function getCsrfCookieValue(c: Context): string | undefined {
  const cookies = parse(c.req.header('cookie') ?? '')
  return cookies[CSRF_COOKIE]
}
