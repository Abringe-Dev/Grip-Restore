import { assertDeployableDatabase, loadConfig } from './config.js'
import { openDatabase } from './db/index.js'
import { createApp } from './app.js'

function describeDatabase(url) {
  if (url === ':memory:' || url.startsWith('file:')) return url
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`
  } catch {
    return 'configured database'
  }
}

const config = loadConfig()
assertDeployableDatabase(config)

const db = await openDatabase({
  url: config.databaseUrl,
  authToken: config.databaseAuthToken,
  runMigrations: config.runMigrations,
})
const app = createApp({ db, config })

const server = app.listen(config.port, () => {
  console.log(`Grip Restore API listening on http://localhost:${config.port}`)
  console.log(`Environment: ${config.isProd ? 'production' : 'development'}`)
  console.log(`Database: ${describeDatabase(config.databaseUrl)}`)
  if (!config.requireEmailVerification) {
    console.log('Email verification is disabled for this deployment.')
  }
  if (!config.smtp.host) {
    console.log('SMTP not configured: verification and reset links are logged in development.')
  }
})

function shutdown(signal) {
  console.log(`\n${signal} received, shutting down…`)
  server.close(() => {
    try {
      db.close()
    } catch {
      /* already closed */
    }
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
