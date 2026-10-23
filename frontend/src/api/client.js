const BASE = import.meta.env.VITE_API_BASE ?? ''

export class ApiError extends Error {
  constructor(message, { status = 0, code = '' } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function notifyUnauthorized(path) {
  if (typeof window === 'undefined') return
  if (path === '/auth/me' || path.startsWith('/api/')) {
    window.dispatchEvent(new Event('gr:unauthorized'))
  }
}

export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
  let response
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if (err && err.name === 'AbortError') throw err
    throw new ApiError('We could not reach the server. Please check your connection.', {
      status: 0,
    })
  }

  let data = null
  if (response.status !== 204) {
    try {
      data = await response.json()
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    if (response.status === 401) notifyUnauthorized(path)
    throw new ApiError(data?.error || 'Something went wrong. Please try again.', {
      status: response.status,
      code: data?.code || '',
    })
  }

  return data
}
