import { SignJWT, importPKCS8, importSPKI, jwtVerify } from 'jose'

const ALG = 'EdDSA'
const TTL_SECONDS = 60

let privateKey: CryptoKey | null = null
let publicKey: CryptoKey | null = null

async function getPrivateKey(): Promise<CryptoKey> {
  if (!privateKey) {
    const pem = (process.env.INTERNAL_JWT_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')
    privateKey = await importPKCS8(pem, ALG)
  }
  return privateKey
}

async function getPublicKey(): Promise<CryptoKey> {
  if (!publicKey) {
    const pem = (process.env.INTERNAL_JWT_PUBLIC_KEY ?? '').replace(/\\n/g, '\n')
    publicKey = await importSPKI(pem, ALG)
  }
  return publicKey
}

const tokenCache = new Map<string, { token: string; expiresAt: number }>()

export async function mintInternalJwt(userId: string, email: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const cached = tokenCache.get(userId)
  if (cached && cached.expiresAt > now + 10) {
    return cached.token
  }

  const key = await getPrivateKey()
  const token = await new SignJWT({ sub: userId, email })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(key)

  tokenCache.set(userId, { token, expiresAt: now + TTL_SECONDS })
  return token
}

export async function verifyInternalJwt(token: string): Promise<{ sub: string; email: string }> {
  const key = await getPublicKey()
  const { payload } = await jwtVerify(token, key)
  return payload as { sub: string; email: string }
}
