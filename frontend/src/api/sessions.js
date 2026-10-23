import { apiRequest } from './client.js'

export function listSessions() {
  return apiRequest('/api/sessions')
}

export function createSession(session) {
  return apiRequest('/api/sessions', { method: 'POST', body: session })
}
