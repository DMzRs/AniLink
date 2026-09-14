import { createContext, useContext, useEffect, useState } from 'react'
import { api } from './api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('anilink_admin_user') || 'null') } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('anilink_admin_token'))
  const [pendingToken, setPendingToken] = useState(null)
  const [pendingEmail, setPendingEmail] = useState(null)

  const persist = (t, u) => {
    localStorage.setItem('anilink_admin_token', t)
    localStorage.setItem('anilink_admin_user', JSON.stringify(u))
    setToken(t)
    setUser(u)
  }

  const login = async (email, password) => {
    const res = await api.login(email, password)
    if (res.two_factor_required) {
      // local dev: code_hint present → auto verify
      if (res.code_hint && res.pending_token) {
        const v = await api.verifyTwoFactor(res.code_hint, { pendingToken: res.pending_token })
        if (!v.token) throw new Error('2FA verify failed')
        persist(v.token, v.user)
        return v
      }
      setPendingToken(res.pending_token || null)
      setPendingEmail(email)
      return res
    }
    // farmer 2FA flow — for admin seeded without 2FA, token is directly returned
    const t = res.token || res.pending_token
    if (!t) throw new Error(res.message || 'Login failed')
    persist(t, res.user)
    return res
  }

  const verifyTwoFactor = async (code) => {
    const v = await api.verifyTwoFactor(code, { pendingToken, email: pendingEmail })
    setPendingToken(null)
    setPendingEmail(null)
    persist(v.token, v.user)
    return v
  }

  const logout = () => {
    localStorage.removeItem('anilink_admin_token')
    localStorage.removeItem('anilink_admin_user')
    setToken(null); setUser(null)
    setPendingToken(null); setPendingEmail(null)
  }

  useEffect(() => {
    if (token && !user) {
      api.me().then(d => setUser(d.user)).catch(() => logout())
    }
  }, [])

  return <AuthCtx.Provider value={{ user, token, pendingToken, pendingEmail, login, verifyTwoFactor, logout, setUser }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
