import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEV_PEPPER = 'grip-restore-dev-pepper-do-not-use-in-production'

function parseOrigins(raw) {
  return String(raw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export function loadConfig(env = process.env) {
  const isProd = env.NODE_ENV === 'production'
  const pepper = String(env.PASSWORD_PEPPER ?? '').trim() || (isProd ? '' : DEV_PEPPER)
  if (!pepper) {
    throw new Error('PASSWORD_PEPPER must be set in production')
  }

  const databasePath = env.DATABASE_PATH
    ? path.resolve(BACKEND_ROOT, env.DATABASE_PATH)
    : path.join(BACKEND_ROOT, 'data', 'grip-restore.db')

  return {
    isProd,
    port: Number(env.PORT) || 3001,
    appUrl: String(env.APP_URL || 'http://localhost:5173').replace(/\/$/, ''),
    origins: parseOrigins(env.APP_ORIGIN || 'http://localhost:5173,http://localhost:5199'),
    databasePath,
    pepper,
    trustProxy: String(env.TRUST_PROXY ?? '0') === '1',
    sessionTtlDays: 30,
    sessionRenewDays: 15,
    maxSessionsPerUser: 10,
    resetTtlMinutes: 30,
    verificationTtlHours: 24,
    lockout: { maxFailures: 5, minutes: 15 },
    rateLimits: {
      loginWindowMs: 15 * 60 * 1000,
      loginMax: 10,
      registerWindowMs: 60 * 60 * 1000,
      registerMax: 5,
      recoveryWindowMs: 60 * 60 * 1000,
      recoveryMax: 5,
    },
    smtp: {
      host: String(env.SMTP_HOST || '').trim(),
      port: Number(env.SMTP_PORT) || 587,
      secure: String(env.SMTP_SECURE ?? 'false') === 'true',
      user: String(env.SMTP_USER || ''),
      pass: String(env.SMTP_PASS || ''),
      from: String(env.SMTP_FROM || 'Grip Restore <no-reply@grip-restore.local>'),
    },
  }
}
