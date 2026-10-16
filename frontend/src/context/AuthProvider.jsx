import { useState, useCallback } from 'react'
import { AuthContext } from './authContext'
import { normalizeEmail, lookupProfile, emailPrefix } from '../data/userStore'

const STORAGE_KEY = 'grip-restore-auth-v1'

function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { isAuthenticated: false, userId: null, userName: '' }
    const parsed = JSON.parse(raw)
    const userId = normalizeEmail(parsed && parsed.email)
    if (!userId) return { isAuthenticated: false, userId: null, userName: '' }
    return {
      isAuthenticated: true,
      userId,
      userName: parsed && typeof parsed.name === 'string' ? parsed.name : '',
    }
  } catch {
    return { isAuthenticated: false, userId: null, userName: '' }
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession)

  const login = useCallback((email, name) => {
    const userId = normalizeEmail(email)
    if (!userId) return
    const profile = lookupProfile(userId)
    const cleanName = String(name ?? '').trim()
    const userName = cleanName || (profile && profile.name) || emailPrefix(userId)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ email: userId, name: userName }))
    } catch {
      /* storage unavailable */
    }
    setSession({ isAuthenticated: true, userId, userName })
  }, [])

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* storage unavailable */
    }
    setSession({ isAuthenticated: false, userId: null, userName: '' })
  }, [])

  return (
    <AuthContext.Provider value={{ ...session, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}