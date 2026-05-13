import { Hono } from 'hono'
import { db, passkeys, passkeyChallenge, sessions, users } from '../../db/index.js'
import { eq, and, gt } from 'drizzle-orm'
import { beginRegistration, finishRegistration, beginLogin, finishLogin } from '../../lib/webauthn.js'
import { requireAuth } from '../../middleware/session.js'
import { generateOpaqueToken, hashToken } from '../../lib/tokens.js'
import { generateCsrfSecret } from '../../lib/csrf.js'
import { setSessionCookie, setCsrfCookie } from '../../lib/cookies.js'
import { audit } from '../../lib/audit.js'
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server'

export const passkeyRouter = new Hono()

const ip = (c: { req: { header: (h: string) => string | undefined } }) =>
  c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

passkeyRouter.post('/register/begin', async (c) => {
  const session = requireAuth(c)
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, session.userId))
  const existing = await db.select({ credentialId: passkeys.credentialId }).from(passkeys).where(eq(passkeys.userId, session.userId))

  const options = await beginRegistration(session.userId, user.email, existing.map((e) => e.credentialId))
  await db.insert(passkeyChallenge).values({
    challenge: options.challenge,
    userId: session.userId,
    purpose: 'register',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  })

  return c.json(options)
})

passkeyRouter.post('/register/finish', async (c) => {
  const session = requireAuth(c)
  const body = await c.req.json() as RegistrationResponseJSON & { deviceLabel?: string }

  const now = new Date()
  const [challenge] = await db.select().from(passkeyChallenge)
    .where(and(eq(passkeyChallenge.userId, session.userId), eq(passkeyChallenge.purpose, 'register'), gt(passkeyChallenge.expiresAt, now)))
    .limit(1)

  if (!challenge) return c.json({ error: 'Challenge expired' }, 400)

  const result = await finishRegistration(body, challenge.challenge).catch(() => null)
  if (!result?.verified || !result.registrationInfo) return c.json({ error: 'Verification failed' }, 400)

  const { credential } = result.registrationInfo
  await db.insert(passkeys).values({
    userId: session.userId,
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey),
    signCount: credential.counter,
    transports: (body.response.transports ?? []) as string[],
    deviceLabel: body.deviceLabel ?? null,
  })

  await db.delete(passkeyChallenge).where(eq(passkeyChallenge.id, challenge.id))
  await audit('passkey.register', { userId: session.userId, ip: ip(c) })
  return c.json({ ok: true })
})

passkeyRouter.post('/login/begin', async (c) => {
  const body = await c.req.json().catch(() => ({})) as { email?: string }
  let allowCredentials: { id: string }[] = []

  if (body.email) {
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email.toLowerCase())).limit(1)
    if (user) {
      allowCredentials = await db.select({ credId: passkeys.credentialId }).from(passkeys).where(eq(passkeys.userId, user.id))
        .then((rows) => rows.map((r) => ({ id: r.credId })))
    }
  }

  const options = await beginLogin(allowCredentials)
  await db.insert(passkeyChallenge).values({
    challenge: options.challenge,
    purpose: 'login',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  })

  return c.json(options)
})

passkeyRouter.post('/login/finish', async (c) => {
  const body = await c.req.json() as AuthenticationResponseJSON
  const now = new Date()

  const [challenge] = await db.select().from(passkeyChallenge)
    .where(and(eq(passkeyChallenge.purpose, 'login'), gt(passkeyChallenge.expiresAt, now)))
    .limit(1)

  if (!challenge) return c.json({ error: 'Challenge expired' }, 400)

  const [pk] = await db.select().from(passkeys).where(eq(passkeys.credentialId, body.id)).limit(1)
  if (!pk) return c.json({ error: 'Unknown passkey' }, 400)

  const result = await finishLogin(body, challenge.challenge, {
    credentialID: pk.credentialId,
    credentialPublicKey: new Uint8Array(pk.publicKey as Buffer),
    counter: pk.signCount,
    transports: pk.transports ?? [],
  }).catch(() => null)

  if (!result?.verified) return c.json({ error: 'Verification failed' }, 401)

  await db.update(passkeys).set({ signCount: result.authenticationInfo.newCounter, lastUsedAt: now }).where(eq(passkeys.id, pk.id))
  await db.delete(passkeyChallenge).where(eq(passkeyChallenge.id, challenge.id))

  const [user] = await db.select({ email: users.email, mfaEnabled: users.mfaEnabled }).from(users).where(eq(users.id, pk.userId))
  const sessionToken = generateOpaqueToken(32)
  const csrfSecret = generateCsrfSecret()

  await db.insert(sessions).values({
    userId: pk.userId,
    sessionTokenHash: hashToken(sessionToken),
    csrfSecret,
    userAgent: c.req.header('user-agent'),
    ip: ip(c),
    pendingMfa: user.mfaEnabled,
    expiresAt: new Date(Date.now() + 14 * 86400 * 1000),
  })

  setSessionCookie(c, sessionToken)
  setCsrfCookie(c, csrfSecret)
  await audit('passkey.login', { userId: pk.userId, ip: ip(c) })

  return c.json({ ok: true, email: user.email, needs_mfa: user.mfaEnabled })
})
