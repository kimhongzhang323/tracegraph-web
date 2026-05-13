import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server'

const RP_ID = process.env.WEBAUTHN_RP_ID ?? 'localhost'
const RP_NAME = 'TraceGraph'
const ORIGIN = process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:5173'

export async function beginRegistration(userId: string, email: string, existingCredentialIds: string[]) {
  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(userId),
    userName: email,
    userDisplayName: email,
    attestationType: 'none',
    excludeCredentials: existingCredentialIds.map((id) => ({ id, type: 'public-key' })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  })
}

export async function finishRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string,
) {
  return verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedRPID: RP_ID,
    expectedOrigin: ORIGIN,
    requireUserVerification: false,
  })
}

export async function beginLogin(allowCredentials: { id: string }[]) {
  return generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'preferred',
    allowCredentials: allowCredentials.map((c) => ({ id: c.id, type: 'public-key' })),
  })
}

export async function finishLogin(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  authenticator: { credentialID: string; credentialPublicKey: Uint8Array; counter: number; transports?: string[] },
) {
  return verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedRPID: RP_ID,
    expectedOrigin: ORIGIN,
    requireUserVerification: false,
    credential: {
      id: authenticator.credentialID,
      publicKey: new Uint8Array(authenticator.credentialPublicKey.buffer.slice(0) as ArrayBuffer),
      counter: authenticator.counter,
      transports: authenticator.transports as ('ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb')[],
    },
  })
}
