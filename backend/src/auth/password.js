import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)

// NIST SP 800-63B-aligned storage: memory-hard KDF, per-user salt, no
// reversible encoding, constant-time verification.
export const SCRYPT_PARAMS = { N: 32768, r: 8, p: 1 }
export const KEY_LENGTH = 64
export const SALT_LENGTH = 16
const MAX_MEMORY = 128 * 1024 * 1024

const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128
const COMMON_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', 'password', 'password1', 'password123',
  'qwerty123', 'qwertyui', 'iloveyou', 'admin123', 'letmein1', 'welcome1',
  'abc12345', 'football', 'baseball', 'sunshine', 'princess', 'dragon123',
  'monkey123', 'trustno1', 'passw0rd', 'p@ssw0rd', 'changeme', 'secret123',
])

function pepperPassword(password, pepper) {
  return createHmac('sha256', pepper).update(String(password), 'utf8').digest()
}

export function validatePasswordPolicy(password, { email = '', name = '' } = {}) {
  const value = String(password ?? '')
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    return `Passwords must be ${MAX_PASSWORD_LENGTH} characters or fewer.`
  }
  const lowered = value.toLowerCase()
  if (COMMON_PASSWORDS.has(lowered)) {
    return 'That password is too common. Please choose a stronger one.'
  }
  if (email && lowered === String(email).toLowerCase()) {
    return 'Your password cannot be the same as your email address.'
  }
  if (name && lowered === String(name).toLowerCase()) {
    return 'Your password cannot be the same as your name.'
  }
  return null
}

export async function hashPassword(password, pepper) {
  const salt = randomBytes(SALT_LENGTH)
  const derived = await scrypt(pepperPassword(password, pepper), salt, KEY_LENGTH, {
    ...SCRYPT_PARAMS,
    maxmem: MAX_MEMORY,
  })
  return [
    'scrypt',
    SCRYPT_PARAMS.N,
    SCRYPT_PARAMS.r,
    SCRYPT_PARAMS.p,
    salt.toString('base64'),
    Buffer.from(derived).toString('base64'),
  ].join('$')
}

export async function verifyPassword(password, stored, pepper) {
  try {
    const parts = String(stored ?? '').split('$')
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false
    const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts
    const N = Number(nRaw)
    const r = Number(rRaw)
    const p = Number(pRaw)
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false
    if (N < 16384 || N > 1048576 || r < 1 || r > 32 || p < 1 || p > 16) return false
    const salt = Buffer.from(saltRaw, 'base64')
    const expected = Buffer.from(hashRaw, 'base64')
    if (salt.length === 0 || expected.length === 0) return false
    const derived = await scrypt(pepperPassword(password, pepper), salt, expected.length, {
      N,
      r,
      p,
      maxmem: MAX_MEMORY,
    })
    const actual = Buffer.from(derived)
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

let dummyHashPromise = null

// Runs a real verify for unknown emails so login timing does not reveal
// whether an account exists.
export async function verifyDummyPassword(password, pepper) {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword('grip-restore-timing-placeholder', pepper)
  }
  const hash = await dummyHashPromise
  await verifyPassword(password, hash, pepper)
  return false
}
