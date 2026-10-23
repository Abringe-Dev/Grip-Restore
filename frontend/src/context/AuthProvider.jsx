import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext'
import { apiRequest } from '../api/client'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    apiRequest('/auth/me')
      .then((data) => {
        if (active) setUser(data)
      })
      .catch(() => {
        /* not signed in — RequireAuth will redirect */
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const onUnauthorized = () => setUser(null)
    window.addEventListener('gr:unauthorized', onUnauthorized)
    return () => {
      active = false
      window.removeEventListener('gr:unauthorized', onUnauthorized)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await apiRequest('/auth/login', { method: 'POST', body: { email, password } })
    setUser(data)
    return data
  }, [])

  const register = useCallback(
    (payload) => apiRequest('/auth/register', { method: 'POST', body: payload }),
    [],
  )

  const logout = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      userId: user?.id ?? null,
      userName: user?.name ?? '',
      isAuthenticated: Boolean(user),
      loading,
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
