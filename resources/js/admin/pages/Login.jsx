import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { login, verifyTwoFactor, pendingToken, user } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('admin@anilink.test')
  const [password, setPassword] = useState('password123')
  const [code, setCode] = useState('')
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.role === 'admin') nav('/', { replace: true })
  }, [user, nav])

  const submit = async (e) => {
    e.preventDefault()
    setErr(null); setLoading(true)
    try {
      if (pendingToken) {
        const res = await verifyTwoFactor(code)
        if (res.user?.role !== 'admin') setErr(`Signed in as ${res.user?.role} — admin required. Use admin@anilink.test`)
        else nav('/')
        return
      }
      const res = await login(email, password)
      if (res?.two_factor_required) return
      if (res.user?.role !== 'admin') setErr(`Signed in as ${res.user?.role} — admin required. Use admin@anilink.test`)
      else nav('/')
    } catch (e2) {
      setErr(e2.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center p-6 relative overflow-hidden">
      {/* soft brand accents */}
      <div className="absolute -top-16 -left-16 w-64 h-64 rounded-[32px] bg-[#E8F0E9] -z-10" aria-hidden="true" />
      <div className="absolute -bottom-20 -right-10 w-72 h-72 rounded-full bg-[#FFF4D6] -z-10" aria-hidden="true" />

      <div className="w-full max-w-[420px] bg-white rounded-[16px] border border-[#E8E2D6] p-8 shadow-[0_8px_24px_rgba(46,83,57,0.08)]">
        <div className="flex items-center gap-3 mb-6">
          <img src="/apple-touch-icon-180.png" alt="AniLink logo" className="w-10 h-10 rounded-xl shadow-[0_4px_12px_rgba(46,83,57,0.12)]" />
          <div>
            <div className="font-semibold">AniLink Admin</div>
            <div className="text-xs text-[#8A8A8A]">Cultivating Connection, Harvesting Fair Trades.</div>
          </div>
        </div>
        <h1 className="text-xl font-semibold leading-6">{pendingToken ? 'Enter 2FA code' : 'Sign in to the admin console'}</h1>
        <p className="text-sm text-[#5C5C5C] mt-1">{pendingToken ? 'Enter the 6-digit code we sent you.' : 'Verify farmers, review listings, and keep the marketplace fair.'}</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {pendingToken ? (
            <label className="block">
              <span className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">6-digit code</span>
              <input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" inputMode="numeric" autoFocus className="mt-1 w-full h-11 rounded-full border border-[#E8E2D6] px-4 text-center tracking-[0.4em] focus:outline-none focus:border-[#2E5339] focus:ring-2 focus:ring-[#E8F0E9]" />
            </label>
          ) : (
          <>
          <label className="block">
            <span className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Email</span>
            <input value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full h-11 rounded-full border border-[#E8E2D6] px-4 focus:outline-none focus:border-[#2E5339] focus:ring-2 focus:ring-[#E8F0E9]" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Password</span>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full h-11 rounded-full border border-[#E8E2D6] px-4 focus:outline-none focus:border-[#2E5339] focus:ring-2 focus:ring-[#E8F0E9]" />
          </label>
          </>
          )}
          {err && <div className="rounded-xl bg-[#FDEDEC] border border-[#E8C6C6] p-3 text-sm text-[#B0413E]">{err}</div>}
          <button disabled={loading} className="w-full h-11 rounded-full bg-[#2E5339] text-white font-semibold hover:bg-[#24412D] disabled:opacity-60 transition">{loading ? 'Signing in…' : pendingToken ? 'Verify code' : 'Sign in'}</button>
          <div className="text-xs text-[#8A8A8A] text-center">Demo account: admin@anilink.test / password123</div>
          <div className="text-xs text-center"><Link to="/forgot-password" className="text-[#2E5339] font-semibold underline">Forgot password?</Link></div>
        </form>
      </div>
    </div>
  )
}
