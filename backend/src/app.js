import express from 'express'
import helmet from 'helmet'
import { createAuthRouter } from './routes/auth.js'
import { createPracticeRouter } from './routes/practice.js'
import { createSessionsRouter } from './routes/sessions.js'
import { requireAuth } from './auth/middleware.js'
import { buildRateLimiters } from './middleware/rateLimit.js'
import { csrfGuard } from './middleware/csrf.js'

function cors(config) {
  return (req, res, next) => {
    const origin = req.get('origin')
    if (origin && config.origins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin)
      res.set('Access-Control-Allow-Credentials', 'true')
      res.set('Access-Control-Allow-Headers', 'Content-Type')
      res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      res.set('Vary', 'Origin')
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204)
      return
    }
    next()
  }
}

export function createApp({ db, config }) {
  const app = express()
  const limits = buildRateLimiters(config)

  app.disable('x-powered-by')
  if (config.trustProxy) app.set('trust proxy', 1)

  app.use(
    helmet({
      // The API only emits JSON; the SPA is served by Vite/static hosting.
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  )
  app.use((req, res, next) => {
    res.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()')
    next()
  })
  app.use(cors(config))
  app.use(express.json({ limit: '16kb', type: 'application/json' }))
  app.use(csrfGuard(config))

  app.get('/health', (req, res) => {
    res.json({ ok: true })
  })

  app.use('/auth', createAuthRouter({ db, config, limits }))
  app.use('/api/sessions', createSessionsRouter({ db, requireAuth: requireAuth(db, config) }))
  app.use('/api/practice', createPracticeRouter({ db, requireAuth: requireAuth(db, config) }))

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found.' })
  })

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err && err.type === 'entity.too.large') {
      res.status(413).json({ error: 'Request body is too large.' })
      return
    }
    if (err && (err.type === 'entity.parse.failed' || err instanceof SyntaxError)) {
      res.status(400).json({ error: 'Request body must be valid JSON.' })
      return
    }
    if (!config.isProd) console.error('[api]', err)
    res.status(500).json({ error: 'Something went wrong. Please try again.' })
  })

  return app
}
