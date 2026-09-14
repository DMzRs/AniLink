import { useState } from 'react'
import { Link } from 'react-router-dom'

// Two-step password reset: request a 6-digit code, then set a new password.
// Talks straight to /api with no auth so shop, manage, and admin can all mount it.
// loginPath points the "back to sign in" link at the mounting SPA's own login page.
export default function ForgotPassword({ loginPath = '/login' }) {
  const [step, setStep] = useState('email') // email | reset | done
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  const post = async (path, body) => {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(json?.message || `Request failed (${res.status})`)
    return json
  }

  const requestCode = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const res = await post('/password/forgot', { email })
      if (res.code_hint) setCode(res.code_hint) // local dev convenience, mirrors login auto-verify
      setStep('reset')
      setNotice(res.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const resetPassword = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const res = await post('/password/reset', { email, code, password, password_confirmation: passwordConfirmation })
      setStep('done')
      setNotice(res.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-[#E8E2D6] rounded-[16px] p-6">
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="text-sm text-[#5C5C5C] mt-1">
          {step === 'email' && 'Enter your account email and we will send you a 6-digit reset code.'}
          {step === 'reset' && `Enter the code sent to ${email} and choose a new password.`}
          {step === 'done' && 'All done — every signed-in device was signed out for safety.'}
        </p>

        {step === 'email' && (
          <form onSubmit={requestCode} className="mt-5 space-y-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#E8E2D6] rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-[#2E5339]"
            />
            {error && <div className="text-sm text-[#B0413E] bg-[#F6E3E2] border border-[#E5B9B6] rounded-[10px] px-3 py-2">{error}</div>}
            <button
              disabled={busy}
              className="w-full py-3 rounded-[12px] bg-[#2E5339] text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Send reset code'}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={resetPassword} className="mt-5 space-y-3">
            {notice && <div className="text-sm text-[#4A7C59] bg-[#E8F0E9] border border-[#C5D9C7] rounded-[10px] px-3 py-2">{notice}</div>}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              required
              className="w-full text-center text-2xl tracking-[0.4em] border border-[#E8E2D6] rounded-[12px] px-4 py-3 focus:outline-none focus:border-[#2E5339]"
            />
            <input
              type="password"
              required
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#E8E2D6] rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-[#2E5339]"
            />
            <input
              type="password"
              required
              placeholder="Confirm new password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              className="w-full border border-[#E8E2D6] rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-[#2E5339]"
            />
            {error && <div className="text-sm text-[#B0413E] bg-[#F6E3E2] border border-[#E5B9B6] rounded-[10px] px-3 py-2">{error}</div>}
            <button
              disabled={busy}
              className="w-full py-3 rounded-[12px] bg-[#2E5339] text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50"
            >
              {busy ? 'Resetting…' : 'Set new password'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="mt-5 space-y-3">
            {notice && <div className="text-sm text-[#4A7C59] bg-[#E8F0E9] border border-[#C5D9C7] rounded-[10px] px-3 py-2">{notice}</div>}
            <Link
              to={loginPath}
              className="block w-full text-center py-3 rounded-[12px] bg-[#2E5339] text-white text-sm font-semibold hover:brightness-110"
            >
              Back to sign in
            </Link>
          </div>
        )}

        <p className="text-xs text-[#5C5C5C] mt-4 text-center">
          Remembered it? <Link to={loginPath} className="text-[#2E5339] font-semibold underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
