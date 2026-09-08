import React, { createContext, useContext, useState } from 'react';
import { api, setAuthToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const login = async (email, password) => {
    const json = await api.request('/login', { method: 'POST', body: { email, password } });
    if (json.two_factor_required) {
      // For demo we auto-verify if code_hint present (local env)
      if (json.code_hint) {
        const v = await api.request('/2fa/verify', { method: 'POST', headers: { Authorization: `Bearer ${json.pending_token}` }, body: { code: json.code_hint } });
        setAuthToken(v.token);
        setToken(v.token);
        setUser(v.user);
        return v;
      }
      throw new Error('2FA required');
    }
    setAuthToken(json.token);
    setToken(json.token);
    setUser(json.user);
    return json;
  };

  const logout = async () => {
    try { await api.request('/logout', { method: 'POST', auth: true }); } catch {}
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, setUser, setToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
