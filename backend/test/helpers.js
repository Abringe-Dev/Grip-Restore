import { loadConfig } from '../src/config.js'
import { openDatabase } from '../src/db/index.js'
import { createApp } from '../src/app.js'

export async function startTestServer({ env = {}, configure } = {}) {
  const config = loadConfig({
    NODE_ENV: 'test',
    PASSWORD_PEPPER: 'test-pepper-not-for-production',
    APP_ORIGIN: 'http://localhost:5173',
    APP_URL: 'http://localhost:5173',
    ...env,
  })
  if (configure) configure(config)

  const db = openDatabase(env.DATABASE_PATH ?? ':memory:')
  const app = createApp({ db, config })
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}`

  async function request(path, { method = 'GET', body, headers = {}, cookie, rawBody } = {}) {
    const init = {
      method,
      headers: {
        Origin: 'http://localhost:5173',
        ...(body !== undefined || rawBody !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
    }
    const res = await fetch(base + path, init)
    const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : []
    let data = null
    try {
      data = await res.json()
    } catch {
      data = null
    }
    const sessionCookie = setCookies[0] ? setCookies[0].split(';')[0] : null
    return { status: res.status, data, setCookies, sessionCookie, headers: res.headers }
  }

  return {
    config,
    db,
    server,
    base,
    request,
    close: () =>
      new Promise((resolve) => {
        server.close(() => {
          try {
            db.close()
          } catch {
            /* already closed */
          }
          resolve()
        })
      }),
  }
}

export function tokenFromUrl(url) {
  return new URL(url).searchParams.get('token')
}

export async function registerUser(ctx, { name = 'Ada', email, password = 'correct-horse-42' } = {}) {
  const res = await ctx.request('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  })
  return res
}

export async function verifyToken(ctx, token) {
  return ctx.request('/auth/verify-email', { method: 'POST', body: { token } })
}

export async function login(ctx, { email, password = 'correct-horse-42' }) {
  return ctx.request('/auth/login', { method: 'POST', body: { email, password } })
}

/** Register + verify; returns the login response with a session cookie. */
export async function createVerifiedUser(ctx, options = {}) {
  const email = options.email ?? `user-${Math.random().toString(16).slice(2)}@example.com`
  const password = options.password ?? 'correct-horse-42'
  const registered = await registerUser(ctx, { ...options, email, password })
  const token = tokenFromUrl(registered.data.devVerifyUrl)
  await verifyToken(ctx, token)
  const loggedIn = await login(ctx, { email, password })
  return { email, password, registered, loggedIn, cookie: loggedIn.sessionCookie }
}
