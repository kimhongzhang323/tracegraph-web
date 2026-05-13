import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from './schema.js'

let _db: NeonHttpDatabase<typeof schema> | null = null

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set — add it to .env.local')
    _db = drizzle(neon(url), { schema })
  }
  return _db
}

// Proxy so existing code can keep using `db.select(...)` etc.
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export * from './schema.js'
