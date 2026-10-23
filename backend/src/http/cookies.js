export const DEV_COOKIE_NAME = 'gr_session'
export const PROD_COOKIE_NAME = '__Host-gr_session'

export function sessionCookieName(config) {
  return config.isProd ? PROD_COOKIE_NAME : DEV_COOKIE_NAME
}

export function readCookie(req, name) {
  const header = req.headers?.cookie
  if (!header) return null
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=')
    if (index < 0) continue
    if (part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim())
      } catch {
        return null
      }
    }
  }
  return null
}

export function readSessionToken(req, config) {
  return readCookie(req, sessionCookieName(config))
}

export function setSessionCookie(res, config, token, maxAgeSeconds) {
  const parts = [
    `${sessionCookieName(config)}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ]
  if (config.isProd) parts.push('Secure')
  res.append('Set-Cookie', parts.join('; '))
}

export function clearSessionCookie(res, config) {
  const parts = [
    `${sessionCookieName(config)}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ]
  if (config.isProd) parts.push('Secure')
  res.append('Set-Cookie', parts.join('; '))
}
