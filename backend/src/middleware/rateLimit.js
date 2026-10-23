import { ipKeyGenerator, rateLimit } from 'express-rate-limit'

function limiter({ windowMs, limit, keyGenerator, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    handler: (req, res) => {
      res.status(429).json({ error: message })
    },
  })
}

const normalize = (value) => String(value ?? '').trim().toLowerCase()

// IPv6 addresses are grouped by subnet so a client cannot rotate addresses
// within its /64 to bypass the limit.
const clientKey = (req) => `${ipKeyGenerator(req.ip)}|${normalize(req.body?.email)}`

export function buildRateLimiters(config) {
  const limits = config.rateLimits

  const login = limiter({
    windowMs: limits.loginWindowMs,
    limit: limits.loginMax,
    keyGenerator: clientKey,
    message: 'Too many login attempts. Please try again later.',
  })

  const register = limiter({
    windowMs: limits.registerWindowMs,
    limit: limits.registerMax,
    keyGenerator: clientKey,
    message: 'Too many accounts created from this address. Please try again later.',
  })

  const recovery = limiter({
    windowMs: limits.recoveryWindowMs,
    limit: limits.recoveryMax,
    keyGenerator: clientKey,
    message: 'Too many requests. Please try again later.',
  })

  return { login, register, recovery }
}
