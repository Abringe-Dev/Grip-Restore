import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { migrate } from './migrate.js'

function normalizeUrl(input) {
  const value = String(input ?? '').trim()
  if (!value) throw new Error('A database URL is required')
  if (value === ':memory:') return value
  if (/^(file|libsql|https?|wss?):/i.test(value)) return value
  return pathToFileURL(path.resolve(value)).href
}

function isLocalUrl(url) {
  return url === ':memory:' || url.startsWith('file:')
}

function statement(executor, sql) {
  return {
    async run(...args) {
      const result = await executor.execute({ sql, args })
      return {
        changes: Number(result.rowsAffected ?? 0),
        lastInsertRowid: result.lastInsertRowid,
      }
    },
    async get(...args) {
      const result = await executor.execute({ sql, args })
      return result.rows[0]
    },
    async all(...args) {
      const result = await executor.execute({ sql, args })
      return result.rows
    },
  }
}

function wrapExecutor(executor) {
  return {
    raw: executor,
    execute(stmtOrSql, args) {
      const stmt =
        typeof stmtOrSql === 'string' ? { sql: stmtOrSql, args: args ?? [] } : stmtOrSql
      return executor.execute(stmt)
    },
    executeMultiple(sql) {
      return executor.executeMultiple(sql)
    },
    prepare(sql) {
      return statement(executor, sql)
    },
  }
}

export async function openDatabase({ url, authToken = '', runMigrations = true } = {}) {
  const databaseUrl = normalizeUrl(url)
  const local = isLocalUrl(databaseUrl)

  if (local && databaseUrl !== ':memory:') {
    const file = fileURLToPath(databaseUrl)
    fs.mkdirSync(path.dirname(file), { recursive: true })
  }

  const { createClient } = local
    ? await import('@libsql/client')
    : await import('@libsql/client/web')
  const client = createClient({
    url: databaseUrl,
    authToken: authToken || undefined,
    timeout: 5000,
  })

  const db = wrapExecutor(client)
  db.url = databaseUrl
  db.isLocal = local
  db.close = () => client.close()

  if (local && databaseUrl !== ':memory:') {
    await db.execute('PRAGMA journal_mode = WAL')
    await db.execute('PRAGMA synchronous = NORMAL')
  }
  if (local) {
    await db.execute('PRAGMA foreign_keys = ON')
  }
  if (runMigrations) {
    await migrate(db)
  }

  return db
}

export async function transaction(db, fn) {
  const tx = await db.raw.transaction('write')
  const wrapped = wrapExecutor(tx)
  try {
    const result = await fn(wrapped)
    await tx.commit()
    return result
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
