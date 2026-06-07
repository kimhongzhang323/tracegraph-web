import type { Context } from 'hono'
import { Resend } from 'resend'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

const FROM   = () => process.env.EMAIL_FROM    ?? 'noreply@tracegraph.site'
const ORIGIN = () => process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:5173'

async function withRetry(fn: () => Promise<unknown>, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      await fn()
      return
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)))
    }
  }
}

function runAsyncTask(c: Context, promise: Promise<void>) {
  if (c.executionCtx?.waitUntil) {
    c.executionCtx.waitUntil(promise)
  } else {
    promise.catch((err) => {
      console.error('Background task failed:', err)
    })
  }
}

export function sendVerificationEmail(c: Context, email: string, token: string) {
  const url = `${ORIGIN()}/verify-email?token=${token}`
  const resend = getResend()
  if (!resend) {
    console.log(`\n📧 [DEV EMAIL] To: ${email}\n🔗 Verification Link: ${url}\n`)
    return
  }

  const promise = withRetry(async () => {
    await resend.emails.send({
      from: FROM(), to: email,
      subject: 'Verify your TraceGraph email',
      html: `<p>Click <a href="${url}">here</a> to verify your email. Link expires in 24 hours.</p>`,
    })
  }).catch((err) => {
    console.error(`Failed to send verification email to ${email} after retries:`, err)
  })

  runAsyncTask(c, promise)
}

export function sendPasswordResetEmail(c: Context, email: string, token: string) {
  const url = `${ORIGIN()}/reset-password?token=${token}`
  const resend = getResend()
  if (!resend) {
    console.log(`\n📧 [DEV EMAIL] To: ${email}\n🔗 Reset Password Link: ${url}\n`)
    return
  }

  const promise = withRetry(async () => {
    await resend.emails.send({
      from: FROM(), to: email,
      subject: 'Reset your TraceGraph password',
      html: `<p>Click <a href="${url}">here</a> to reset your password. Link expires in 1 hour.</p><p>If you did not request this, ignore this email.</p>`,
    })
  }).catch((err) => {
    console.error(`Failed to send password reset email to ${email} after retries:`, err)
  })

  runAsyncTask(c, promise)
}

export function sendMagicLinkEmail(c: Context, email: string, token: string) {
  const url = `${ORIGIN()}/magic-link?token=${token}`
  const resend = getResend()
  if (!resend) {
    console.log(`\n📧 [DEV EMAIL] To: ${email}\n🔗 Magic Link: ${url}\n`)
    return
  }

  const promise = withRetry(async () => {
    await resend.emails.send({
      from: FROM(), to: email,
      subject: 'Your TraceGraph sign-in link',
      html: `<p>Click <a href="${url}">here</a> to sign in. Link expires in 15 minutes and can only be used once.</p>`,
    })
  }).catch((err) => {
    console.error(`Failed to send magic link email to ${email} after retries:`, err)
  })

  runAsyncTask(c, promise)
}
