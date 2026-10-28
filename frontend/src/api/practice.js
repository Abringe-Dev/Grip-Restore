import { apiRequest } from './client.js'

export function getPracticeProgress() {
  return apiRequest('/api/practice')
}

export function recordPracticeAttempt(gesture, success) {
  return apiRequest('/api/practice/attempts', {
    method: 'POST',
    body: { gesture, success },
  })
}
