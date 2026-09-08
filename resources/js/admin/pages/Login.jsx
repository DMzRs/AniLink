import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { login, user } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('admin@anilink.test')
  const [password, setPassword] = useState('password123')
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)

  if (user?.role === 'admin') {
    // already authed
    nav('/')
  }

  const submit = async (e) => {
    e.preventDefault()
    setErr(null); setLoading(true)
    try {
      const res = await login(email, password)
      if (res.user?.role !== 'admin') setErr(`Signed in as ${res.user?.role} — admin required. Use admin@anilink.test`)
      else nav('/')
    } catch (e2) {
      setErr(e2.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] bg-white rounded-[16px] border border-[#E8E2D6] p-8 shadow-[0_8px_24px_rgba(46,83,57,0.08)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#2E5339] flex items-center justify-center text-white font-bold">A</div>
          <div>
            <div className="font-semibold">AniLink Admin</div>
            <div className="text-xs text-[#8A8A8A]">Forest Green #2E5339 · Harvest Gold #D4A017</div>
          </div>
        </div>
        <h1 className="text-xl font-semibold leading-6">Sign in — admin only</h1>
        <p className="text-sm text-[#5C5C5C] mt-1">Use seeded admin. 2FA not enforced for admin in dev.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Email</span>
            <input value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full h-11 rounded-full border border-[#E8E2D6] px-4 focus:outline-none focus:border-[#2E5339] focus:ring-2 focus:ring-[#E8F0E9]" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Password</span>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full h-11 rounded-full border border-[#E8E2D6] px-4 focus:outline-none focus:border-[#2E5339] focus:ring-2 focus:ring-[#E8F0E9]" />
          </label>
          {err && <div className="rounded-xl bg-[#FDEDEC] border border-[#E8C6C6] p-3 text-sm text-[#B0413E]">{err}</div>}
          <button disabled={loading} className="w-full h-11 rounded-full bg-[#2E5339] text-white font-semibold hover:bg-[#24412D] disabled:opacity-60">{loading ? 'Signing in…' : 'Sign in'}</button>
          <div className="text-xs text-[#8A8A8A] text-center">Demo: admin@anilink.test / password123</div>
        </form>
      </div>
    </div>
  )
}
