import test from 'node:test'
import assert from 'node:assert/strict'
import { loadConfig } from '../src/config.js'
import { login, registerUser, startTestServer } from './helpers.js'

test('development trusts Vite fallback ports while production uses APP_URL', () => {
  const dev = loadConfig({ NODE_ENV: 'development' })
  assert.deepEqual(dev.origins, [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5199',
  ])

  const prod = loadConfig({
    NODE_ENV: 'production',
    PASSWORD_PEPPER: 'prod-test-pepper-value',
    APP_URL: 'https://grip.example/',
  })
  assert.deepEqual(prod.origins, ['https://grip.example'])

  const override = loadConfig({
    NODE_ENV: 'development',
    APP_ORIGIN: 'http://localhost:6000',
  })
  assert.deepEqual(override.origins, ['http://localhost:6000'])
})

test('security headers are present and framework details are hidden', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  const res = await ctx.request('/health')
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(res.headers.get('x-frame-options'), 'DENY')
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer')
  assert.match(res.headers.get('permissions-policy'), /camera=\(self\)/)
  assert.match(res.headers.get('content-security-policy'), /default-src 'none'/)
  assert.equal(res.headers.get('x-powered-by'), null)
})

test('CSRF guard rejects foreign origins and accepts the app origin', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  const foreign = await ctx.request('/auth/login', {
    method: 'POST',
    headers: { Origin: 'http://evil.example' },
    body: { email: 'a@example.com', password: 'whatever-123' },
  })
  assert.equal(foreign.status, 403)
  assert.match(foreign.data.error, /untrusted origin/i)

  const allowed = await ctx.request('/auth/login', {
    method: 'POST',
    body: { email: 'a@example.com', password: 'whatever-123' },
  })
  assert.equal(allowed.status, 401, 'reaches the handler when origin is trusted')
})

test('production requires an Origin and uses Secure __Host cookies', async (t) => {
  const ctx = await startTestServer({
    env: { NODE_ENV: 'production', PASSWORD_PEPPER: 'prod-test-pepper-value' },
  })
  t.after(() => ctx.close())

  const missingOrigin = await ctx.request('/auth/login', {
    method: 'POST',
    headers: { Origin: '' },
    body: { email: 'a@example.com', password: 'whatever-123' },
  })
  assert.equal(missingOrigin.status, 403)
  assert.match(missingOrigin.data.error, /missing origin/i)

  const user = await registerUser(ctx, { email: 'prod@example.com' })
  assert.equal(user.status, 201)
  assert.equal(user.data.devVerifyUrl, undefined, 'production never returns the link')

  ctx.db
    .prepare('UPDATE users SET email_verified_at = ? WHERE email = ?')
    .run(new Date().toISOString(), 'prod@example.com')
  const loggedIn = await login(ctx, { email: 'prod@example.com' })
  assert.equal(loggedIn.status, 200)
  const cookie = loggedIn.setCookies[0]
  assert.match(cookie, /^__Host-gr_session=/)
  assert.match(cookie, /Secure/)
  assert.match(cookie, /HttpOnly/)
})

test('malformed JSON and oversized bodies are rejected', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  const malformed = await ctx.request('/auth/login', {
    method: 'POST',
    rawBody: '{"email":',
  })
  assert.equal(malformed.status, 400)

  const oversized = await ctx.request('/auth/login', {
    method: 'POST',
    rawBody: JSON.stringify({ email: 'a@example.com', password: 'x'.repeat(20_000) }),
  })
  assert.equal(oversized.status, 413)
})

test('login rate limiting returns 429 once the window is exhausted', async (t) => {
  const ctx = await startTestServer({
    configure: (config) => {
      config.rateLimits.loginMax = 2
    },
  })
  t.after(() => ctx.close())

  const attempt = () => login(ctx, { email: 'throttle@example.com', password: 'wrong-password-1' })
  assert.equal((await attempt()).status, 401)
  assert.equal((await attempt()).status, 401)
  const limited = await attempt()
  assert.equal(limited.status, 429)
  assert.match(limited.data.error, /too many/i)
})

test('SQL injection payloads are treated as literal values', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  const email = "o'brien@example.com"
  const registered = await registerUser(ctx, { email })
  assert.equal(registered.status, 201)

  const stored = ctx.db.prepare('SELECT email FROM users WHERE email = ?').get(email)
  assert.equal(stored.email, email)

  const res = await login(ctx, { email, password: 'anything-1234' })
  assert.equal(res.status, 401)

  const rows = ctx.db.prepare('SELECT COUNT(*) AS count FROM users').get()
  assert.equal(rows.count, 1, 'no injection widened the query')
})

test('passwords are stored as scrypt hashes, never plaintext', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  await registerUser(ctx, { email: 'hash@example.com', password: 'hash-me-please-77' })
  const row = ctx.db.prepare('SELECT password_hash FROM users WHERE email = ?').get('hash@example.com')
  assert.match(row.password_hash, /^scrypt\$32768\$8\$1\$/)
  assert.ok(!row.password_hash.includes('hash-me-please-77'))
})

test('registration validates the email format and rejects missing fields', async (t) => {
  const ctx = await startTestServer()
  t.after(() => ctx.close())

  const badEmail = await registerUser(ctx, { email: 'not-an-email' })
  assert.equal(badEmail.status, 400)

  const missing = await ctx.request('/auth/register', {
    method: 'POST',
    body: { email: 'missing@example.com', password: 'correct-horse-42' },
  })
  assert.equal(missing.status, 400)

  const unknown = await ctx.request('/does-not-exist')
  assert.equal(unknown.status, 404)
})
