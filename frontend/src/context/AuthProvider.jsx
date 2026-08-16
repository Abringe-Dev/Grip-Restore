import { useState, useCallback } from 'react'
import { AuthContext } from './authContext'

const STORAGE_KEY = 'grip-restore-auth'

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const login = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      /* storage unavailable */
    }
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* storage unavailable */
    }
    setIsAuthenticated(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}