import { randomBytes } from 'node:crypto'

export type OAuthProvider = 'google' | 'github'

interface OAuthConfig {
  authUrl: string
  tokenUrl: string
  userUrl: string
  clientId: string
  clientSecret: string
  scope: string
}

const CONFIGS: Record<OAuthProvider, OAuthConfig> = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '',
    scope: 'openid email profile',
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userUrl: 'https://api.github.com/user',
    clientId: process.env.GITHUB_OAUTH_CLIENT_ID ?? '',
    clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET ?? '',
    scope: 'read:user user:email',
  },
}

const ORIGIN = process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:5173'

export function getOAuthConfig(provider: OAuthProvider): OAuthConfig {
  return CONFIGS[provider]
}

export function buildAuthUrl(provider: OAuthProvider, state: string, codeVerifier: string): string {
  const cfg = CONFIGS[provider]
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: `${ORIGIN}/api/auth/oauth/${provider}/callback`,
    response_type: 'code',
    scope: cfg.scope,
    state,
  })
  if (provider === 'google') {
    params.set('nonce', randomBytes(16).toString('hex'))
    params.set('code_challenge_method', 'plain')
    params.set('code_challenge', codeVerifier)
  }
  return `${cfg.authUrl}?${params}`
}

export async function exchangeCode(provider: OAuthProvider, code: string, codeVerifier: string): Promise<string> {
  const cfg = CONFIGS[provider]
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code,
    redirect_uri: `${ORIGIN}/api/auth/oauth/${provider}/callback`,
    ...(provider === 'google' ? { code_verifier: codeVerifier } : {}),
  })
  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const data = await res.json() as { access_token: string }
  return data.access_token
}

export async function getOAuthUser(provider: OAuthProvider, accessToken: string): Promise<{ id: string; email: string; emailVerified: boolean }> {
  const cfg = CONFIGS[provider]
  const res = await fetch(cfg.userUrl, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'User-Agent': 'TraceGraph/1.0' },
  })
  const data = await res.json() as Record<string, unknown>

  if (provider === 'google') {
    return {
      id: String(data.sub),
      email: String(data.email),
      emailVerified: Boolean(data.email_verified),
    }
  }

  // GitHub: email needs verified check via separate request
  let email = String(data.email ?? '')
  let emailVerified = false
  try {
    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'User-Agent': 'TraceGraph/1.0' },
    })
    if (emailRes.ok) {
      const emails = await emailRes.json() as { email: string; primary: boolean; verified: boolean }[]
      const best = emails.find((e) => e.verified && e.primary) ?? emails.find((e) => e.verified)
      if (best) {
        email = best.email
        emailVerified = true
      } else if (email) {
        const match = emails.find((e) => e.email === email)
        emailVerified = match ? match.verified : false
      }
    }
  } catch {
    emailVerified = false
  }

  return { id: String(data.id), email, emailVerified }
}
