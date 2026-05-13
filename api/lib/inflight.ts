// Prevents concurrent identical idempotent operations (e.g., session lookups)
// from fanning out to the database.

const inflight = new Map<string, Promise<unknown>>()

export function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (inflight.has(key)) return inflight.get(key) as Promise<T>
  const p = fn().finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}
