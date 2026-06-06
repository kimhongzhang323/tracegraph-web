import { neon } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http'
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

let _db: any = null

export function getDb(): any {
  if (!_db) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set — add it to .env.local')

    const isLocal = url.includes('localhost') || url.includes('127.0.0.1')
    if (isLocal) {
      const client = postgres(url)
      _db = drizzlePg(client, { schema })
    } else {
      _db = drizzleNeon(neon(url), { schema })
    }
  }
  return _db
}

// Proxy so existing code can keep using `db.select(...)` etc.
export const db = new Proxy({} as any, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export * from './schema.js'
