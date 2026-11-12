// Numbered migrations applied inside a transaction and tracked in
// _schema_version. Append new entries; never edit an applied migration.
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
    sql: `
      ALTER TABLE game_sessions
        ADD COLUMN gesture_stats TEXT NOT NULL DEFAULT '{}';
    `,
  },
  {
    version: 3,
    sql: `
      CREATE TABLE practice_progress (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        gesture TEXT NOT NULL CHECK (gesture IN ('pinch', 'fist', 'palm')),
        attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
        successes INTEGER NOT NULL DEFAULT 0 CHECK (successes >= 0),
        current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
        best_streak INTEGER NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, gesture)
      );
    `,
  },
]

const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version

async function currentVersion(db) {
  const tracker = await db.prepare('SELECT version FROM _schema_version WHERE id = 1').get()
  let current = Number(tracker?.version) || 0
  if (current > 0) return current

  try {
    const legacy = await db.prepare('PRAGMA user_version').get()
    const legacyVersion = Number(legacy?.user_version) || 0
    if (legacyVersion > 0) {
      current = Math.min(legacyVersion, LATEST_VERSION)
      await db
        .prepare('UPDATE _schema_version SET version = ? WHERE id = 1')
        .run(current)
    }
  } catch {
    /* Turso exposes user_version as read-only; a fresh database has no legacy version. */
  }

  return current
}

export async function migrate(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS _schema_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL
    );
  `)
  await db.execute('INSERT OR IGNORE INTO _schema_version (id, version) VALUES (1, 0)')

  let current = await currentVersion(db)
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue

    const tx = await db.raw.transaction('write')
    try {
      const versionRow = await tx.execute({
        sql: 'SELECT version FROM _schema_version WHERE id = 1',
        args: [],
      })
      const latest = Number(versionRow.rows[0]?.version) || 0
      if (latest >= migration.version) {
        current = latest
        await tx.commit()
        continue
      }

      await tx.executeMultiple(migration.sql)
      await tx.execute({
        sql: 'UPDATE _schema_version SET version = ? WHERE id = 1',
        args: [migration.version],
      })
      if (db.isLocal) {
        try {
          await tx.execute(`PRAGMA user_version = ${migration.version}`)
        } catch {
          /* rollback compatibility only; Turso exposes user_version as read-only */
        }
      }
      await tx.commit()
      current = migration.version
    } catch (err) {
      try {
        await tx.rollback()
      } catch {
        /* already rolled back */
      }
      throw err
    } finally {
      tx.close()
    }
  }

  return current
}
