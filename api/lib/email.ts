import { Resend } from 'resend'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set — add it to .env.local')
  return new Resend(key)
}

const FROM   = () => process.env.EMAIL_FROM    ?? 'noreply@tracegraph.site'
const ORIGIN = () => process.env.WEBAUTHN_ORIGIN ?? 'https://www.tracegraph.site'

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${ORIGIN()}/verify-email?token=${token}`
  await getResend().emails.send({
    from: FROM(), to: email,
    subject: 'Verify your TraceGraph email',
    html: `<p>Click <a href="${url}">here</a> to verify your email. Link expires in 24 hours.</p>`,
  })
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${ORIGIN()}/reset-password?token=${token}`
  await getResend().emails.send({
    from: FROM(), to: email,
    subject: 'Reset your TraceGraph password',
    html: `<p>Click <a href="${url}">here</a> to reset your password. Link expires in 1 hour.</p><p>If you did not request this, ignore this email.</p>`,
  })
}

export async function sendMagicLinkEmail(email: string, token: string) {
  const url = `${ORIGIN()}/magic-link?token=${token}`
  await getResend().emails.send({
    from: FROM(), to: email,
    subject: 'Your TraceGraph sign-in link',
    html: `<p>Click <a href="${url}">here</a> to sign in. Link expires in 15 minutes and can only be used once.</p>`,
  })
}
