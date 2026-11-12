import { resolveSession } from './sessions.js'
import { readSessionToken } from '../http/cookies.js'

export function requireAuth(db, config) {
  return async (req, res, next) => {
    try {
      const token = readSessionToken(req, config)
      const resolved = await resolveSession(db, token, config)
      if (!resolved) {
        res.status(401).json({ error: 'Please log in to continue.' })
        return
      }
      req.user = resolved.user
      req.sessionToken = token
      next()
    } catch (err) {
      next(err)
    }
  }
}
