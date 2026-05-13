import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { securityHeaders } from './middleware/securityHeaders.js'
import { sessionMiddleware } from './middleware/session.js'
import { csrfMiddleware } from './middleware/csrf.js'
import { passwordRouter } from './routes/auth/password.js'
import { oauthRouter } from './routes/auth/oauth.js'
import { magicRouter } from './routes/auth/magic.js'
import { passkeyRouter } from './routes/auth/passkey.js'
import { mfaRouter } from './routes/auth/mfa.js'
import { sessionRouter } from './routes/auth/session.js'
import { meRouter } from './routes/me.js'
import { proxyRouter } from './routes/proxy.js'

const app = new Hono().basePath('/api')

app.use('*', securityHeaders)
app.use('*', sessionMiddleware)
app.use('*', csrfMiddleware)

app.route('/auth', passwordRouter)
app.route('/auth/oauth', oauthRouter)
app.route('/auth', magicRouter)
app.route('/auth/passkey', passkeyRouter)
app.route('/auth', mfaRouter)
app.route('/auth', sessionRouter)
app.route('/me', meRouter)
app.route('/traces', proxyRouter)

app.get('/health', (c) => c.json({ ok: true }))

app.onError((err, c) => {
  const status = (err as { status?: number }).status ?? 500
  const message = status < 500 ? err.message : 'Internal server error'
  return c.json({ error: message }, status as 400 | 401 | 403 | 404 | 429 | 500)
})

export default handle(app)
