import { resolveSession } from './sessions.js'
import { readSessionToken } from '../http/cookies.js'

export function requireAuth(db, config) {
  return (req, res, next) => {
    const token = readSessionToken(req, config)
    const resolved = resolveSession(db, token, config)
    if (!resolved) {
      res.status(401).json({ error: 'Please log in to continue.' })
      return
    }
    req.user = resolved.user
    req.sessionToken = token
    next()
  }
}
