// Numbered migrations applied inside a transaction and tracked with
// PRAGMA user_version. Append new entries; never edit an applied migration.
const MIGRATIONS = [
  {
    version: 1,
    sql: `
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL COLLATE NOCASE UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        email_verified_at TEXT,
        failed_login_count INTEGER NOT NULL DEFAULT 0,
        locked_until TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE auth_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        user_agent TEXT,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);

      CREATE TABLE email_verification_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_email_verification_user ON email_verification_tokens(user_id);

      CREATE TABLE password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_password_reset_user ON password_reset_tokens(user_id);

      CREATE TABLE game_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        duration_min INTEGER NOT NULL,
        difficulty TEXT NOT NULL DEFAULT '',
        hits INTEGER,
        misses INTEGER,
        accuracy INTEGER NOT NULL,
        gesture TEXT NOT NULL DEFAULT '',
        gestures TEXT NOT NULL DEFAULT '[]',
        calibration TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX idx_game_sessions_user_created ON game_sessions(user_id, created_at DESC);
    `,
  },
  {
    version: 2,
    // Per-gesture outcomes let the weekly plan focus on the grips that
    // actually need practice, while legacy rows simply read as {}.
    sql: `
      ALTER TABLE game_sessions
        ADD COLUMN gesture_stats TEXT NOT NULL DEFAULT '{}';
    `,
  },
]

export function migrate(db) {
  const current = Number(db.prepare('PRAGMA user_version').get().user_version) || 0
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue
    db.exec('BEGIN')
    try {
      db.exec(migration.sql)
      db.exec(`PRAGMA user_version = ${migration.version}`)
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
  }
  return MIGRATIONS[MIGRATIONS.length - 1].version
}
