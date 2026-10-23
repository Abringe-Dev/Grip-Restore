import { createHash, randomBytes } from 'node:crypto'

// Tokens are handed to the user once and stored only as a SHA-256 digest.
// A database leak therefore does not expose usable session/reset tokens.
export function createToken() {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token) }
}

export function hashToken(token) {
  return createHash('sha256').update(String(token), 'utf8').digest('hex')
}

export function newId() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : randomBytes(16).toString('hex')
}

export function addMs(ms, from = Date.now()) {
  return new Date(from + ms).toISOString()
}

export function addDays(days) {
  return addMs(days * 24 * 60 * 60 * 1000)
}

export function addMinutes(minutes) {
  return addMs(minutes * 60 * 1000)
}

export function addHours(hours) {
  return addMs(hours * 60 * 60 * 1000)
}

export function isExpired(iso, now = Date.now()) {
  const time = Date.parse(String(iso ?? ''))
  return !Number.isFinite(time) || time <= now
}
