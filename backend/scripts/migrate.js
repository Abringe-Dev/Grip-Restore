import { assertDeployableDatabase, loadConfig } from '../src/config.js'
import { openDatabase } from '../src/db/index.js'
import { migrate } from '../src/db/migrate.js'

function describeTarget(url) {
  if (url === ':memory:' || url.startsWith('file:')) return url
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`
  } catch {
    return 'remote database'
  }
}

const config = loadConfig()
assertDeployableDatabase(config)

const db = await openDatabase({
  url: config.databaseUrl,
  authToken: config.databaseAuthToken,
  runMigrations: false,
})

try {
  const version = await migrate(db)
  console.log(`Database schema is at version ${version} (${describeTarget(config.databaseUrl)})`)
} finally {
  db.close()
}
