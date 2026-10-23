import { Router } from 'express'
import {
  hashPassword,
  validatePasswordPolicy,
  verifyDummyPassword,
  verifyPassword,
} from '../auth/password.js'
import { addHours, addMinutes, createToken, hashToken, isExpired, newId } from '../auth/tokens.js'
import { createSession, publicUser, revokeAllSessions, revokeSession } from '../auth/sessions.js'
import { requireAuth } from '../auth/middleware.js'
import { clearSessionCookie, readSessionToken, setSessionCookie } from '../http/cookies.js'
import { normalizeEmail, validate } from '../middleware/validate.js'
import {
  emailSchema,
  loginSchema,
  registerSchema,
  resetSchema,
  verifySchema,
} from '../validation/schemas.js'
import { resetUrl, sendMail, verificationUrl } from '../mailer.js'
import { transaction } from '../db/index.js'

function issueVerificationToken(db, userId, config) {
  db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').run(userId)
  const { token, hash } = createToken()
  db.prepare(
    `INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(newId(), userId, hash, addHours(config.verificationTtlHours), new Date().toISOString())
  return token
}

function issueResetToken(db, userId, config) {
  db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(userId)
  const { token, hash } = createToken()
  db.prepare(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(newId(), userId, hash, addMinutes(config.resetTtlMinutes), new Date().toISOString())
  return token
}

async function deliver(config, { to, subject, text }) {
  try {
    return await sendMail(config, { to, subject, text })
  } catch (err) {
    console.error('[mail] delivery failed:', err && err.message ? err.message : err)
    return false
  }
}

function verificationBody(config, user, url) {
  return {
    to: user.email,
    subject: 'Verify your Grip Restore email',
    text: `Hi ${user.name},\n\nConfirm your email address to finish setting up your account:\n\n${url}\n\nThis link expires in ${config.verificationTtlHours} hours. If you did not create an account, you can ignore this message.`,
  }
}

function resetBody(config, user, url) {
  return {
    to: user.email,
    subject: 'Reset your Grip Restore password',
    text: `Hi ${user.name},\n\nUse this link to choose a new password:\n\n${url}\n\nThis link expires in ${config.resetTtlMinutes} minutes and can only be used once. If you did not request it, you can ignore this message.`,
  }
}

export function createAuthRouter({ db, config, limits }) {
  const router = Router()

  router.post('/register', limits.register, validate(registerSchema), async (req, res, next) => {
    try {
      const { name, email, password } = req.valid
      const policyError = validatePasswordPolicy(password, { email, name })
      if (policyError) {
        res.status(400).json({ error: policyError })
        return
      }

      const normalized = normalizeEmail(email)
      const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(normalized)
      const passwordHash = await hashPassword(password, config.pepper)
      const now = new Date().toISOString()

      if (existing && existing.email_verified_at) {
        res.status(409).json({ error: 'Unable to create an account with these details.' })
        return
      }

      let user
      if (existing) {
        // Unverified accounts may retry registration; this refreshes the
        // password but still requires proving control of the mailbox.
        db.prepare(
          `UPDATE users
           SET name = ?, password_hash = ?, updated_at = ?, failed_login_count = 0, locked_until = NULL
           WHERE id = ?`,
        ).run(name, passwordHash, now, existing.id)
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id)
      } else {
        const id = newId()
        db.prepare(
          `INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).run(id, normalized, name, passwordHash, now, now)
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
      }

      const token = issueVerificationToken(db, user.id, config)
      const url = verificationUrl(config, token)
      await deliver(config, verificationBody(config, user, url))

      const body = { message: 'Check your email to verify your account.' }
      if (!config.isProd) body.devVerifyUrl = url
      res.status(201).json(body)
    } catch (err) {
      next(err)
    }
  })

  router.post('/login', limits.login, validate(loginSchema), async (req, res, next) => {
    try {
      const { email, password } = req.valid
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizeEmail(email))

      if (user && user.locked_until && !isExpired(user.locked_until)) {
        res.status(429).json({ error: 'Too many attempts. Please try again later.' })
        return
      }

      const valid = user
        ? await verifyPassword(password, user.password_hash, config.pepper)
        : await verifyDummyPassword(password, config.pepper)

      if (!valid) {
        if (user) {
          const failures = user.failed_login_count + 1
          if (failures >= config.lockout.maxFailures) {
            db.prepare(
              'UPDATE users SET failed_login_count = 0, locked_until = ? WHERE id = ?',
            ).run(addMinutes(config.lockout.minutes), user.id)
          } else {
            db.prepare('UPDATE users SET failed_login_count = ? WHERE id = ?').run(
              failures,
              user.id,
            )
          }
        }
        res.status(401).json({ error: 'Invalid email or password.' })
        return
      }

      if (!user.email_verified_at) {
        res.status(403).json({
          error: 'Please verify your email address before logging in.',
          code: 'EMAIL_NOT_VERIFIED',
        })
        return
      }

      db.prepare('UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = ?').run(
        user.id,
      )

      const { token } = createSession(db, user.id, req.get('user-agent'), config)
      setSessionCookie(res, config, token, config.sessionTtlDays * 24 * 60 * 60)
      res.json(publicUser(user))
    } catch (err) {
      next(err)
    }
  })

  router.post('/logout', (req, res) => {
    revokeSession(db, readSessionToken(req, config))
    clearSessionCookie(res, config)
    res.status(204).end()
  })

  router.get('/me', requireAuth(db, config), (req, res) => {
    res.json(publicUser(req.user))
  })

  router.post('/forgot-password', limits.recovery, validate(emailSchema), async (req, res, next) => {
    try {
      const body = { message: 'If an account exists for that email, a reset link has been sent.' }
      const user = db
        .prepare('SELECT * FROM users WHERE email = ?')
        .get(normalizeEmail(req.valid.email))

      if (user && user.email_verified_at) {
        const token = issueResetToken(db, user.id, config)
        const url = resetUrl(config, token)
        await deliver(config, resetBody(config, user, url))
        if (!config.isProd) body.devResetUrl = url
      }

      res.json(body)
    } catch (err) {
      next(err)
    }
  })

  router.post('/reset-password', limits.recovery, validate(resetSchema), async (req, res, next) => {
    try {
      const policyError = validatePasswordPolicy(req.valid.password)
      if (policyError) {
        res.status(400).json({ error: policyError })
        return
      }

      const row = db
        .prepare('SELECT * FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL')
        .get(hashToken(req.valid.token))

      if (!row || isExpired(row.expires_at)) {
        res.status(400).json({ error: 'This reset link is invalid or has expired.' })
        return
      }

      const passwordHash = await hashPassword(req.valid.password, config.pepper)
      const now = new Date().toISOString()

      transaction(db, () => {
        db.prepare(
          `UPDATE users
           SET password_hash = ?, updated_at = ?, failed_login_count = 0, locked_until = NULL
           WHERE id = ?`,
        ).run(passwordHash, now, row.user_id)
        db.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?').run(now, row.id)
        db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ? AND id <> ?').run(
          row.user_id,
          row.id,
        )
        revokeAllSessions(db, row.user_id)
      })

      res.json({ message: 'Your password has been reset. You can log in now.' })
    } catch (err) {
      next(err)
    }
  })

  router.post('/verify-email', validate(verifySchema), (req, res, next) => {
    try {
      const row = db
        .prepare('SELECT * FROM email_verification_tokens WHERE token_hash = ? AND used_at IS NULL')
        .get(hashToken(req.valid.token))

      if (!row || isExpired(row.expires_at)) {
        res.status(400).json({ error: 'This verification link is invalid or has expired.' })
        return
      }

      const now = new Date().toISOString()
      transaction(db, () => {
        db.prepare(
          'UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?), updated_at = ? WHERE id = ?',
        ).run(now, now, row.user_id)
        db.prepare('UPDATE email_verification_tokens SET used_at = ? WHERE id = ?').run(now, row.id)
        db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ? AND id <> ?').run(
          row.user_id,
          row.id,
        )
      })

      res.json({ message: 'Email verified. You can log in now.' })
    } catch (err) {
      next(err)
    }
  })

  router.post(
    '/resend-verification',
    limits.recovery,
    validate(emailSchema),
    async (req, res, next) => {
      try {
        const body = { message: 'If an account needs verification, we have sent a new link.' }
        const user = db
          .prepare('SELECT * FROM users WHERE email = ?')
          .get(normalizeEmail(req.valid.email))

        if (user && !user.email_verified_at) {
          const token = issueVerificationToken(db, user.id, config)
          const url = verificationUrl(config, token)
          await deliver(config, verificationBody(config, user, url))
          if (!config.isProd) body.devVerifyUrl = url
        }

        res.json(body)
      } catch (err) {
        next(err)
      }
    },
  )

  return router
}
