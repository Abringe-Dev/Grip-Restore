import { apiRequest } from './client.js'

export function resendVerification(email) {
  return apiRequest('/auth/resend-verification', { method: 'POST', body: { email } })
}

export function requestPasswordReset(email) {
  return apiRequest('/auth/forgot-password', { method: 'POST', body: { email } })
}

export function resetPassword(token, password) {
  return apiRequest('/auth/reset-password', { method: 'POST', body: { token, password } })
}

export function verifyEmail(token) {
  return apiRequest('/auth/verify-email', { method: 'POST', body: { token } })
}

export function changePassword(currentPassword, newPassword) {
  return apiRequest('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  })
}

export function logoutEverywhere() {
  return apiRequest('/auth/logout-all', { method: 'POST' })
}
