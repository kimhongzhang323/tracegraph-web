import { hash, verify } from '@node-rs/argon2'

const ARGON2_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS)
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return verify(hash, password)
}

export async function hashCode(code: string): Promise<string> {
  return hash(code, { memoryCost: 19456, timeCost: 2, parallelism: 1 })
}

export async function verifyCode(hash: string, code: string): Promise<boolean> {
  return verify(hash, code)
}
