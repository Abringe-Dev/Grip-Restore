const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Defence in depth against CSRF alongside SameSite=Lax cookies: every
 * state-changing request must come from an allowed Origin/Referer.
 * Production rejects missing Origin; development allows non-browser clients
 * (curl/tests) but still rejects foreign origins.
 */
export function csrfGuard(config) {
  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next()

    const originHeader = req.get('origin') || req.get('referer') || ''
    if (!originHeader) {
      if (config.isProd) {
        res.status(403).json({ error: 'Request blocked: missing origin.' })
        return
      }
      return next()
    }

    let origin
    try {
      origin = new URL(originHeader).origin
    } catch {
      res.status(403).json({ error: 'Request blocked: invalid origin.' })
      return
    }

    if (!config.origins.includes(origin)) {
      res.status(403).json({ error: 'Request blocked: untrusted origin.' })
      return
    }
    next()
  }
}
