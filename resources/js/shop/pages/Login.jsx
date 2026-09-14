import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { login, verifyTwoFactor, pendingToken } = useAuth()
  const navgo = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (pendingToken) {
        await verifyTwoFactor(code)
        navgo('/')
      } else {
        const res = await login(form.email, form.password)
        if (res?.two_factor_required) return
        navgo('/')
      }
    } catch (err) {
      setError(err.message || 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-[#E8E2D6] rounded-[16px] p-6">
        <h1 className="text-xl font-semibold">Sign in to AniMarket</h1>
        <p className="text-sm text-[#5C5C5C] mt-1">
          {pendingToken ? 'Enter the 6-digit code we sent you.' : 'Buyers, farmers, and admins all sign in here.'}
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {pendingToken ? (
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              autoFocus
              className="w-full text-center text-2xl tracking-[0.4em] border border-[#E8E2D6] rounded-[12px] px-4 py-3 focus:outline-none focus:border-[#2E5339]"
            />
          ) : (
            <>
              <input
                type="email"
                required
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-[#E8E2D6] rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-[#2E5339]"
              />
              <input
                type="password"
                required
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-[#E8E2D6] rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-[#2E5339]"
              />
            </>
          )}

          {error && <div className="text-sm text-[#B0413E] bg-[#F6E3E2] border border-[#E5B9B6] rounded-[10px] px-3 py-2">{error}</div>}

          <button
            disabled={busy}
            className="w-full py-3 rounded-[12px] bg-[#2E5339] text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Please wait…' : pendingToken ? 'Verify code' : 'Sign in'}
          </button>
        </form>

        {!pendingToken && (
          <p className="text-xs text-[#5C5C5C] mt-4 text-center">
            New here? <Link to="/register" className="text-[#2E5339] font-semibold underline">Create a buyer account</Link>
            <span className="mx-1.5">·</span>
            <Link to="/forgot-password" className="text-[#2E5339] font-semibold underline">Forgot password?</Link>
          </p>
        )}
      </div>
    </div>
  )
}
