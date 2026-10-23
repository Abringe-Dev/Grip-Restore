import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  createVerifiedUser,
  login,
  registerUser,
  startTestServer,
  tokenFromUrl,
  verifyToken,
} from './helpers.js'

const PASSWORD = 'correct-horse-42'

test('registration creates an unverified account and blocks login until verified', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  const registered = await registerUser(ctx, { email: 'New@Example.com' })
  assert.equal(registered.status, 201)
  assert.match(registered.data.message, /verify/i)
  assert.ok(registered.data.devVerifyUrl, 'development exposes the verification link')

  const blocked = await login(ctx, { email: 'new@example.com' })
  assert.equal(blocked.status, 403)
  assert.equal(blocked.data.code, 'EMAIL_NOT_VERIFIED')
  assert.equal(blocked.sessionCookie, null)

  const verified = await verifyToken(ctx, tokenFromUrl(registered.data.devVerifyUrl))
  assert.equal(verified.status, 200)

  const ok = await login(ctx, { email: 'NEW@example.com' })
  assert.equal(ok.status, 200)
  assert.equal(ok.data.email, 'new@example.com')
  assert.equal(ok.data.emailVerified, true)
  assert.equal(ok.data.password, undefined)
  assert.equal(ok.data.password_hash, undefined)
})

test('session cookie is HttpOnly, SameSite=Lax, and usable for /auth/me then logout', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  const user = await createVerifiedUser(ctx)
  assert.equal(user.loggedIn.status, 200)

  const rawCookie = user.loggedIn.setCookies[0]
  assert.match(rawCookie, /HttpOnly/)
  assert.match(rawCookie, /SameSite=Lax/)
  assert.match(rawCookie, /Path=\//)
  assert.match(rawCookie, /Max-Age=\d+/)
  assert.doesNotMatch(rawCookie, /Secure/)

  const me = await ctx.request('/auth/me', { cookie: user.cookie })
  assert.equal(me.status, 200)
  assert.equal(me.data.email, user.email)

  const noCookie = await ctx.request('/auth/me')
  assert.equal(noCookie.status, 401)

  const logout = await ctx.request('/auth/logout', { method: 'POST', cookie: user.cookie })
  assert.equal(logout.status, 204)
  const after = await ctx.request('/auth/me', { cookie: user.cookie })
  assert.equal(after.status, 401)
})

test('password policy rejects short, common, and identity-based passwords', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  const cases = [
    { email: 'a1@example.com', password: 'short' },
    { email: 'a2@example.com', password: 'password123' },
    { email: 'a3@example.com', password: 'a3@example.com' },
    { email: 'a4@example.com', password: 'x'.repeat(129) },
  ]
  for (const body of cases) {
    const res = await registerUser(ctx, { email: body.email, password: body.password })
    assert.equal(res.status, 400, `rejected password: ${body.password.slice(0, 20)}`)
    assert.ok(res.data.error)
  }
})

test('registration rejects unknown fields and duplicate verified emails', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  const extra = await ctx.request('/auth/register', {
    method: 'POST',
    body: { name: 'Ada', email: 'ada@example.com', password: PASSWORD, admin: true },
  })
  assert.equal(extra.status, 400)

  const user = await createVerifiedUser(ctx, { email: 'taken@example.com' })
  assert.equal(user.loggedIn.status, 200)

  const duplicate = await registerUser(ctx, { email: 'TAKEN@example.com' })
  assert.equal(duplicate.status, 409)
  assert.equal(duplicate.data.error, 'Unable to create an account with these details.')
})

test('wrong password and unknown email are indistinguishable', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  await createVerifiedUser(ctx, { email: 'known@example.com' })

  const wrong = await login(ctx, { email: 'known@example.com', password: 'wrong-password-1' })
  const unknown = await login(ctx, { email: 'nobody@example.com', password: 'wrong-password-1' })

  assert.equal(wrong.status, 401)
  assert.equal(unknown.status, 401)
  assert.deepEqual(wrong.data, unknown.data)
})

test('account lockout activates after repeated failures', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  await createVerifiedUser(ctx, { email: 'lock@example.com' })

  for (let i = 0; i < 5; i += 1) {
    const res = await login(ctx, { email: 'lock@example.com', password: `wrong-${i}-password` })
    assert.equal(res.status, 401)
  }

  const locked = await login(ctx, { email: 'lock@example.com', password: PASSWORD })
  assert.equal(locked.status, 429)
  assert.equal(locked.data.error, 'Too many attempts. Please try again later.')
})

test('verification tokens expire and can only be used once', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  const registered = await registerUser(ctx, { email: 'expire@example.com' })
  const token = tokenFromUrl(registered.data.devVerifyUrl)

  ctx.db
    .prepare('UPDATE email_verification_tokens SET expires_at = ? WHERE user_id IS NOT NULL')
    .run(new Date(Date.now() - 60_000).toISOString())

  const expired = await verifyToken(ctx, token)
  assert.equal(expired.status, 400)

  const fresh = await registerUser(ctx, { email: 'once@example.com' })
  const freshToken = tokenFromUrl(fresh.data.devVerifyUrl)
  assert.equal((await verifyToken(ctx, freshToken)).status, 200)
  assert.equal((await verifyToken(ctx, freshToken)).status, 400)
})

test('resending verification invalidates the previous link', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  const first = await registerUser(ctx, { email: 'resend@example.com' })
  const oldToken = tokenFromUrl(first.data.devVerifyUrl)

  const resent = await ctx.request('/auth/resend-verification', {
    method: 'POST',
    body: { email: 'resend@example.com' },
  })
  assert.equal(resent.status, 200)
  const newToken = tokenFromUrl(resent.data.devVerifyUrl)
  assert.notEqual(newToken, oldToken)

  assert.equal((await verifyToken(ctx, oldToken)).status, 400)
  assert.equal((await verifyToken(ctx, newToken)).status, 200)
})

test('forgot-password hides account existence but issues a reset link for verified users', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  await createVerifiedUser(ctx, { email: 'reset@example.com' })

  const unknown = await ctx.request('/auth/forgot-password', {
    method: 'POST',
    body: { email: 'missing@example.com' },
  })
  assert.equal(unknown.status, 200)
  assert.equal(unknown.data.devResetUrl, undefined)

  const known = await ctx.request('/auth/forgot-password', {
    method: 'POST',
    body: { email: 'reset@example.com' },
  })
  assert.equal(known.status, 200)
  assert.ok(known.data.devResetUrl)
})

test('reset-password changes the password, revokes sessions, and is single-use', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  const user = await createVerifiedUser(ctx, { email: 'rotate@example.com' })
  assert.equal(user.loggedIn.status, 200)

  const forgot = await ctx.request('/auth/forgot-password', {
    method: 'POST',
    body: { email: user.email },
  })
  const token = tokenFromUrl(forgot.data.devResetUrl)

  const reset = await ctx.request('/auth/reset-password', {
    method: 'POST',
    body: { token, password: 'brand-new-secret-99' },
  })
  assert.equal(reset.status, 200)

  // Existing session is revoked.
  const oldSession = await ctx.request('/auth/me', { cookie: user.cookie })
  assert.equal(oldSession.status, 401)

  const oldPassword = await login(ctx, { email: user.email, password: user.password })
  assert.equal(oldPassword.status, 401)

  const newPassword = await login(ctx, { email: user.email, password: 'brand-new-secret-99' })
  assert.equal(newPassword.status, 200)

  const replay = await ctx.request('/auth/reset-password', {
    method: 'POST',
    body: { token, password: 'another-secret-100' },
  })
  assert.equal(replay.status, 400)
})

test('change-password requires the current password and revokes other sessions', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  const user = await createVerifiedUser(ctx, { email: 'change@example.com' })
  const second = await login(ctx, { email: user.email, password: user.password })
  assert.equal(second.status, 200)

  const anonymous = await ctx.request('/auth/change-password', {
    method: 'POST',
    body: { currentPassword: user.password, newPassword: 'brand-new-secret-77' },
  })
  assert.equal(anonymous.status, 401)

  const wrongCurrent = await ctx.request('/auth/change-password', {
    method: 'POST',
    cookie: user.cookie,
    body: { currentPassword: 'not-the-password', newPassword: 'brand-new-secret-77' },
  })
  assert.equal(wrongCurrent.status, 400)

  const unchanged = await ctx.request('/auth/change-password', {
    method: 'POST',
    cookie: user.cookie,
    body: { currentPassword: user.password, newPassword: user.password },
  })
  assert.equal(unchanged.status, 400)

  const changed = await ctx.request('/auth/change-password', {
    method: 'POST',
    cookie: user.cookie,
    body: { currentPassword: user.password, newPassword: 'brand-new-secret-77' },
  })
  assert.equal(changed.status, 200)

  const currentDevice = await ctx.request('/auth/me', { cookie: user.cookie })
  assert.equal(currentDevice.status, 200)

  const otherDevice = await ctx.request('/auth/me', { cookie: second.sessionCookie })
  assert.equal(otherDevice.status, 401)

  const oldPassword = await login(ctx, { email: user.email, password: user.password })
  assert.equal(oldPassword.status, 401)

  const newPassword = await login(ctx, { email: user.email, password: 'brand-new-secret-77' })
  assert.equal(newPassword.status, 200)
})

test('logout-all revokes every device', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  const user = await createVerifiedUser(ctx, { email: 'everywhere@example.com' })
  const second = await login(ctx, { email: user.email, password: user.password })
  assert.equal(second.status, 200)

  const res = await ctx.request('/auth/logout-all', { method: 'POST', cookie: user.cookie })
  assert.equal(res.status, 204)

  assert.equal((await ctx.request('/auth/me', { cookie: user.cookie })).status, 401)
  assert.equal((await ctx.request('/auth/me', { cookie: second.sessionCookie })).status, 401)
})

test('accounts persist when the API restarts', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grip-restore-'))
  const dbPath = path.join(dir, 'test.db')
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))

  const first = await startTestServer({ env: { DATABASE_PATH: dbPath } })
  const user = await createVerifiedUser(first, { email: 'persist@example.com' })
  assert.equal(user.loggedIn.status, 200)
  await first.close()

  const second = await startTestServer({ env: { DATABASE_PATH: dbPath } })
  const relogin = await login(second, { email: 'persist@example.com' })
  assert.equal(relogin.status, 200)
  assert.equal(relogin.data.email, 'persist@example.com')
  await second.close()
})
