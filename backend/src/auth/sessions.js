import { addDays, createToken, hashToken, isExpired, newId } from './tokens.js'

export function publicUser(row) {
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    emailVerified: Boolean(row.email_verified_at),
  }
}

export function createSession(db, userId, userAgent, config) {
  const { token, hash } = createToken()
  const now = Date.now()
  db.prepare(
    `INSERT INTO auth_sessions (id, user_id, token_hash, user_agent, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(newId(), userId, hash, String(userAgent ?? '').slice(0, 300), addDays(config.sessionTtlDays), new Date(now).toISOString())

  // Cap concurrent sessions per account: drop the oldest beyond the limit.
  const rows = db
    .prepare('SELECT id FROM auth_sessions WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId)
  if (rows.length > config.maxSessionsPerUser) {
    const stale = db.prepare('DELETE FROM auth_sessions WHERE id = ?')
    rows.slice(config.maxSessionsPerUser).forEach((row) => stale.run(row.id))
  }

  return { token, expiresAt: addDays(config.sessionTtlDays) }
}

export function findSession(db, token) {
  if (!token) return null
  return (
    db
      .prepare(
        `SELECT s.id AS session_id, s.expires_at, s.user_id, u.*
         FROM auth_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?`,
      )
      .get(hashToken(token)) ?? null
  )
}

/**
 * Returns { user, sessionId } for a valid token, or null. Expired sessions
 * are deleted. Sessions close to expiry are renewed (sliding window).
 */
export function resolveSession(db, token, config) {
  const row = findSession(db, token)
  if (!row) return null
  if (isExpired(row.expires_at)) {
    db.prepare('DELETE FROM auth_sessions WHERE id = ?').run(row.session_id)
    return null
  }
  const renewThreshold = config.sessionRenewDays * 24 * 60 * 60 * 1000
  const remaining = Date.parse(row.expires_at) - Date.now()
  if (remaining < renewThreshold) {
    db.prepare('UPDATE auth_sessions SET expires_at = ? WHERE id = ?').run(
      addDays(config.sessionTtlDays),
      row.session_id,
    )
  }
  return { user: row, sessionId: row.session_id }
}

export function revokeSession(db, token) {
  if (!token) return
  db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(hashToken(token))
}

export function revokeAllSessions(db, userId) {
  db.prepare('DELETE FROM auth_sessions WHERE user_id = ?').run(userId)
}
