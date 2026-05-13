import { pgTable, uuid, text, boolean, timestamp, customType, bigint, jsonb, index, unique } from 'drizzle-orm/pg-core'

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() { return 'bytea' },
})

const id = uuid('id').defaultRandom().primaryKey()
const createdAt = timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()

export const users = pgTable('users', {
  id,
  email: text('email').notNull().unique(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  passwordHash: text('password_hash'),
  mfaEnabled: boolean('mfa_enabled').notNull().default(false),
  mfaSecretEnc: text('mfa_secret_enc'),
  createdAt,
  updatedAt,
  disabledAt: timestamp('disabled_at', { withTimezone: true }),
})

export const oauthAccounts = pgTable('oauth_accounts', {
  id,
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  accessTokenEnc: text('access_token_enc'),
  createdAt,
}, (t) => ({
  uniq: unique().on(t.provider, t.providerAccountId),
}))

export const passkeys = pgTable('passkeys', {
  id,
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  credentialId: text('credential_id').notNull().unique(),
  publicKey: bytea('public_key').notNull(),
  signCount: bigint('sign_count', { mode: 'number' }).notNull().default(0),
  transports: text('transports').array(),
  deviceLabel: text('device_label'),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt,
})

export const sessions = pgTable('sessions', {
  id,
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionTokenHash: text('session_token_hash').notNull().unique(),
  csrfSecret: text('csrf_secret').notNull(),
  userAgent: text('user_agent'),
  ip: text('ip'),
  pendingMfa: boolean('pending_mfa').notNull().default(false),
  createdAt,
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (t) => ({
  userExpIdx: index('sessions_user_exp_idx').on(t.userId, t.expiresAt),
}))

export const emailTokens = pgTable('email_tokens', {
  id,
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  purpose: text('purpose').notNull(), // 'verify' | 'reset' | 'magic'
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  ip: text('ip'),
  createdAt,
})

export const recoveryCodes = pgTable('recovery_codes', {
  id,
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  codeHash: text('code_hash').notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt,
})

export const auditLog = pgTable('audit_log', {
  id,
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  event: text('event').notNull(),
  ip: text('ip'),
  ua: text('ua'),
  meta: jsonb('meta'),
  createdAt,
}, (t) => ({
  userIdx: index('audit_log_user_idx').on(t.userId),
  eventIdx: index('audit_log_event_idx').on(t.event),
}))

export const passkeyChallenge = pgTable('passkey_challenges', {
  id,
  challenge: text('challenge').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  purpose: text('purpose').notNull(), // 'register' | 'login'
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt,
})
