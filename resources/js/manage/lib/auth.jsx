import { createContext, useContext, useEffect, useState } from 'react'
import { api } from './api'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('anilink_manage_user') || 'null') } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('anilink_manage_token'))

  const login = async (email, password) => {
    const res = await api.login(email, password)
    let t = res.token || res.pending_token
    if (!t) throw new Error(res.message || 'Login failed')
    if (res.two_factor_required) {
      if (res.code_hint && res.pending_token) {
        const v = await fetch('/api/2fa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${res.pending_token}` },
          body: JSON.stringify({ code: res.code_hint }),
        }).then(r => r.json())
        if (!v.token) throw new Error('2FA failed')
        t = v.token
        localStorage.setItem('anilink_manage_token', t)
        localStorage.setItem('anilink_manage_user', JSON.stringify(v.user))
        setToken(t); setUser(v.user); return v
      }
      throw new Error('2FA required')
    }
    localStorage.setItem('anilink_manage_token', t)
    localStorage.setItem('anilink_manage_user', JSON.stringify(res.user))
    setToken(t); setUser(res.user)
    return res
  }

  const logout = () => {
    localStorage.removeItem('anilink_manage_token')
    localStorage.removeItem('anilink_manage_user')
    setToken(null); setUser(null)
  }

  useEffect(() => {
    if (token && !user) {
      api.me().then(d => setUser(d.user)).catch(() => logout())
    }
  }, [])

  return <Ctx.Provider value={{ user, token, login, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
