import { loadConfig } from './config.js'
import { openDatabase } from './db/index.js'
import { createApp } from './app.js'

const config = loadConfig()
const db = openDatabase(config.databasePath)
const app = createApp({ db, config })

const server = app.listen(config.port, () => {
  console.log(`Grip Restore API listening on http://localhost:${config.port}`)
  console.log(`Environment: ${config.isProd ? 'production' : 'development'}`)
  console.log(`Database: ${config.databasePath}`)
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
