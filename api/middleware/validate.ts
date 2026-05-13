// api/middleware/validate.ts
import { z } from 'zod'
import type { Context } from 'hono'

export async function parseBody<T>(c: Context, schema: z.ZodSchema<T>): Promise<{ data: T } | { error: Response }> {
  let raw: unknown
  try { raw = await c.req.json() } catch { raw = {} }
  const result = schema.safeParse(raw)
  if (!result.success) {
    return { error: c.json({ error: 'Invalid input', issues: result.error.flatten().fieldErrors }, 400) }
  }
  return { data: result.data }
}
