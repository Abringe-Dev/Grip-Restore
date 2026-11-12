import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEV_PEPPER = 'grip-restore-dev-pepper-do-not-use-in-production'
const REMOTE_DATABASE = /^(libsql|https?|wss?):/i

function parseOrigins(raw) {
  return String(raw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function parseFlag(raw, fallback) {
  const value = String(raw ?? '').trim().toLowerCase()
  if (!value) return fallback
  return !['0', 'false', 'no', 'off'].includes(value)
}

function databaseUrl(env, isProd) {
  const remote = String(env.TURSO_DATABASE_URL ?? '').trim()
  if (remote) return remote

  const localPath = String(env.DATABASE_PATH ?? '').trim()
  if (localPath === ':memory:') return localPath
  if (localPath) return pathToFileURL(path.resolve(BACKEND_ROOT, localPath)).href
  if (isProd) {
    throw new Error('TURSO_DATABASE_URL must be set in production')
  }
  return pathToFileURL(path.join(BACKEND_ROOT, 'data', 'grip-restore.db')).href
}

export function assertDeployableDatabase(config) {
  if (!config.isProd) return
  if (!REMOTE_DATABASE.test(config.databaseUrl)) {
    throw new Error('Production must use a remote Turso database, not a local file')
  }
  if (!config.databaseAuthToken) {
    throw new Error('TURSO_AUTH_TOKEN must be set in production')
  }
}

export function loadConfig(env = process.env) {
  const isProd = env.NODE_ENV === 'production'
  const pepper = String(env.PASSWORD_PEPPER ?? '').trim() || (isProd ? '' : DEV_PEPPER)
  if (!pepper) {
    throw new Error('PASSWORD_PEPPER must be set in production')
  }

  const url = databaseUrl(env, isProd)
  const authToken = String(env.TURSO_AUTH_TOKEN ?? '').trim()
  if (REMOTE_DATABASE.test(url) && !authToken) {
    throw new Error('TURSO_AUTH_TOKEN must be set for a remote database')
  }

  const appUrl = String(env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')
  const devOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5199',
  ].join(',')

  return {
    isProd,
    port: Number(env.PORT) || 3001,
    appUrl,
    origins: parseOrigins(env.APP_ORIGIN || (isProd ? appUrl : devOrigins)),
    databaseUrl: url,
    databaseAuthToken: authToken,
    runMigrations: parseFlag(env.AUTO_MIGRATE, !isProd),
    requireEmailVerification: parseFlag(env.AUTH_REQUIRE_EMAIL_VERIFICATION, true),
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
