import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createClient } from '@libsql/client'
import { openDatabase } from '../src/db/index.js'

test('fresh databases migrate to the current schema version', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grip-restore-schema-'))
  const dbPath = path.join(dir, 'fresh.db')

  const db = await openDatabase({ url: pathToFileURL(dbPath).href })
  t.after(() => {
    db.close()
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
    } catch (err) {
      if (err.code !== 'EPERM') throw err
    }
  })

  const version = await db.prepare('SELECT version FROM _schema_version WHERE id = 1').get()
  assert.equal(version.version, 3)

  const rollbackVersion = await db.prepare('PRAGMA user_version').get()
  assert.equal(rollbackVersion.user_version, 3)

  const tables = await db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('users', 'practice_progress')",
    )
    .all()
  assert.deepEqual(
    tables.map((row) => row.name).sort(),
    ['practice_progress', 'users'],
  )
})

test('legacy user_version databases seed the migration tracker', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grip-restore-legacy-'))
  const dbPath = path.join(dir, 'legacy.db')
  const url = pathToFileURL(dbPath).href

  const client = createClient({ url })
  await client.execute('CREATE TABLE legacy (id INTEGER)')
  await client.execute('PRAGMA user_version = 3')
  client.close()

  const db = await openDatabase({ url })
  t.after(() => {
    db.close()
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
    } catch (err) {
      if (err.code !== 'EPERM') throw err
    }
  })

  const version = await db.prepare('SELECT version FROM _schema_version WHERE id = 1').get()
  assert.equal(version.version, 3)

  const legacy = await db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'legacy'")
    .get()
  assert.equal(legacy.name, 'legacy')
})
