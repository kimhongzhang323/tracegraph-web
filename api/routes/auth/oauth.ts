import { Hono } from 'hono'
import { randomBytes } from 'node:crypto'
import { serialize, parse } from 'cookie'
import { db, users, oauthAccounts } from '../../db/index.js'
import { eq, and } from 'drizzle-orm'
import { buildAuthUrl, exchangeCode, getOAuthUser, type OAuthProvider } from '../../lib/oauth.js'
import { generateCsrfSecret } from '../../lib/csrf.js'
import { generateOpaqueToken, hashToken } from '../../lib/tokens.js'
import { setSessionCookie, setCsrfCookie } from '../../lib/cookies.js'
import { audit } from '../../lib/audit.js'

export const oauthRouter = new Hono()

const PROVIDERS: OAuthProvider[] = ['google', 'github']

oauthRouter.get('/:provider/start', async (c) => {
  const provider = c.req.param('provider') as OAuthProvider
  if (!PROVIDERS.includes(provider)) return c.json({ error: 'Unknown provider' }, 400)

  const state = randomBytes(16).toString('hex')
  const codeVerifier = randomBytes(32).toString('base64url')

  const url = buildAuthUrl(provider, state, codeVerifier)

  c.header('Set-Cookie', serialize(`oauth_state_${provider}`, `${state}:${codeVerifier}`, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600,
  }))

  return c.redirect(url, 302)
})

oauthRouter.get('/:provider/callback', async (c) => {
  const provider = c.req.param('provider') as OAuthProvider
  if (!PROVIDERS.includes(provider)) return c.json({ error: 'Unknown provider' }, 400)

  const { code, state, error } = c.req.query() as { code?: string; state?: string; error?: string }
  if (error || !code || !state) return c.redirect('/sign-in?error=oauth_denied', 302)

  const cookies = parse(c.req.header('cookie') ?? '')
  const stored = cookies[`oauth_state_${provider}`]
  if (!stored) return c.redirect('/sign-in?error=oauth_state', 302)

  const [storedState, codeVerifier] = stored.split(':')
  if (state !== storedState) return c.redirect('/sign-in?error=oauth_state', 302)

  // Clear state cookie
  c.header('Set-Cookie', serialize(`oauth_state_${provider}`, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 }))

  const accessToken = await exchangeCode(provider, code, codeVerifier).catch(() => null)
  if (!accessToken) return c.redirect('/sign-in?error=oauth_exchange', 302)

  const oauthUser = await getOAuthUser(provider, accessToken).catch(() => null)
  if (!oauthUser?.email) return c.redirect('/sign-in?error=oauth_user', 302)

  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // Find or create user
  let userId: string
  const [existingOauth] = await db.select({ userId: oauthAccounts.userId }).from(oauthAccounts)
    .where(and(eq(oauthAccounts.provider, provider), eq(oauthAccounts.providerAccountId, oauthUser.id))).limit(1)

  if (existingOauth) {
    userId = existingOauth.userId
    await audit('oauth.login', { userId, ip: clientIp, meta: { provider } })
  } else {
    // Find by email for account linking
    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, oauthUser.email)).limit(1)

    if (existingUser) {
      userId = existingUser.id
    } else {
      const [newUser] = await db.insert(users).values({
        email: oauthUser.email,
        emailVerifiedAt: oauthUser.emailVerified ? new Date() : null,
      }).returning({ id: users.id })
      userId = newUser.id
    }

    await db.insert(oauthAccounts).values({ userId, provider, providerAccountId: oauthUser.id })
    await audit('oauth.link', { userId, ip: clientIp, meta: { provider } })
  }

  const [user] = await db.select({ email: users.email, mfaEnabled: users.mfaEnabled }).from(users).where(eq(users.id, userId))
  const token = generateOpaqueToken(32)
  const csrfSecret = generateCsrfSecret()

  const { sessions } = await import('../../db/index.js')
  await db.insert(sessions).values({
    userId,
    sessionTokenHash: hashToken(token),
    csrfSecret,
    userAgent: c.req.header('user-agent'),
    ip: clientIp,
    pendingMfa: user.mfaEnabled,
    expiresAt: new Date(Date.now() + 14 * 86400 * 1000),
  })

  setSessionCookie(c, token)
  setCsrfCookie(c, csrfSecret)

  return c.redirect(user.mfaEnabled ? '/mfa-challenge' : '/trace', 302)
})
