import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import * as authService from '../services/auth.service'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('anora_user')
    return stored ? JSON.parse(stored) : null
  })
  const [isLoading, setIsLoading] = useState(true)

  // On first load, if a token exists, verify it against the backend so a
  // stale/expired token doesn't leave the UI thinking the user is signed in.
  useEffect(() => {
    const token = localStorage.getItem('anora_token')
    if (!token) {
      setIsLoading(false)
      return
    }
    authService
      .fetchCurrentUser()
      .then((data) => {
        setUser(data.user)
        localStorage.setItem('anora_user', JSON.stringify(data.user))
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials)
    localStorage.setItem('anora_token', data.token)
    localStorage.setItem('anora_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const registerAccount = useCallback(async (details) => {
    const data = await authService.register(details)
    localStorage.setItem('anora_token', data.token)
    localStorage.setItem('anora_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('anora_token')
    localStorage.removeItem('anora_user')
    setUser(null)
  }, [])

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    registerAccount,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
