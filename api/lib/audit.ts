import { db, auditLog } from '../db/index.js'

export type AuditEvent =
  | 'register.success'
  | 'login.success'
  | 'login.fail'
  | 'login.mfa.success'
  | 'login.mfa.fail'
  | 'logout'
  | 'logout.all'
  | 'mfa.enroll'
  | 'mfa.disable'
  | 'passkey.register'
  | 'passkey.login'
  | 'passkey.delete'
  | 'oauth.link'
  | 'oauth.login'
  | 'magic.request'
  | 'magic.consume'
  | 'password.reset.request'
  | 'password.reset.complete'
  | 'email.verify'
  | 'session.revoke'
  | 'recovery.use'

export async function audit(
  event: AuditEvent,
  opts: { userId?: string; ip?: string; ua?: string; meta?: Record<string, unknown> } = {},
) {
  try {
    await db.insert(auditLog).values({
      userId: opts.userId ?? null,
      event,
      ip: opts.ip,
      ua: opts.ua,
      meta: opts.meta ?? null,
    })
  } catch (err) {
    console.error(`Failed to write audit log for event ${event}:`, err)
  }
}
