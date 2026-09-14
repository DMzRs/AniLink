import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Register() {
  const { register } = useAuth()
  const navgo = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', password_confirmation: '',
    role: 'buyer_individual', delivery_address: '',
    farm_name: '', barangay: '', municipality: '', province: '', bio: '',
  })
  const [doc, setDoc] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (form.role === 'farmer') {
        const data = new FormData()
        Object.entries(form).forEach(([k, v]) => { if (k !== 'delivery_address') data.append(k, v) })
        data.append('verification_doc', doc)
        await register(data)
      } else {
        await register(form)
      }
      navgo('/')
    } catch (err) {
      const errors = err.data?.errors
      setError(errors ? Object.values(errors).flat().join(' ') : (err.message || 'Registration failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white border border-[#E8E2D6] rounded-[16px] p-6">
        <h1 className="text-xl font-semibold">Create account</h1>
        <p className="text-sm text-[#5C5C5C] mt-1">
          {form.role === 'farmer' ? 'Sell your harvests directly to households and businesses.' : 'Shop fresh harvests directly from verified Filipino farms.'}
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'buyer_individual', label: 'Individual' },
              { value: 'buyer_business', label: 'Business' },
              { value: 'farmer', label: 'Farmer' },
            ].map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setForm({ ...form, role: r.value })}
                className={`py-2.5 rounded-[12px] text-sm font-semibold border transition ${form.role === r.value ? 'bg-[#E8F0E9] border-[#2E5339] text-[#2E5339]' : 'border-[#E8E2D6] text-[#5C5C5C] hover:border-[#C5D9C7]'}`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <input required placeholder="Full name" value={form.name} onChange={set('name')}
            className="w-full border border-[#E8E2D6] rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-[#2E5339]" />
          <input required type="email" placeholder="Email" value={form.email} onChange={set('email')}
            className="w-full border border-[#E8E2D6] rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-[#2E5339]" />
          <input placeholder="Mobile number (optional)" value={form.phone} onChange={set('phone')}
            className="w-full border border-[#E8E2D6] rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-[#2E5339]" />
          {form.role === 'buyer_business' && (
            <input placeholder="Delivery address" value={form.delivery_address} onChange={set('delivery_address')}
              className="w-full border border-[#E8E2D6] rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-[#2E5339]" />
          )}
          {form.role === 'farmer' && (
            <>
              <input required placeholder="Farm name" value={form.farm_name} onChange={set('farm_name')}
                className="w-full border border-[#E8E2D6] rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-[#2E5339]" />
              <div className="grid grid-cols-3 gap-3">
                <input placeholder="Barangay" value={form.barangay} onChange={set('barangay')}
                  className="w-full border border-[#E8E2D6] rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-[#2E5339]" />
                <input placeholder="Municipality" value={form.municipality} onChange={set('municipality')}
                  className="w-full border border-[#E8E2D6] rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-[#2E5339]" />
                <input placeholder="Province" value={form.province} onChange={set('province')}
                  className="w-full border border-[#E8E2D6] rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-[#2E5339]" />
              </div>
              <textarea placeholder="Tell buyers about your farm (optional)" rows={2} value={form.bio} onChange={set('bio')}
                className="w-full border border-[#E8E2D6] rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-[#2E5339]" />
              <div>
                <label className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Verification document</label>
                <input required type="file" accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => setDoc(e.target.files?.[0] ?? null)}
                  className="mt-1 w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-full file:border-0 file:bg-[#E8F0E9] file:text-[#2E5339] file:text-xs file:font-semibold" />
                <p className="text-xs text-[#8A8A8A] mt-1">Photo of a valid ID or farm/business permit (PDF or image, max 5MB). An admin reviews it before your farm gets the verified badge.</p>
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <input required type="password" placeholder="Password" value={form.password} onChange={set('password')}
              className="w-full border border-[#E8E2D6] rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-[#2E5339]" />
            <input required type="password" placeholder="Confirm" value={form.password_confirmation} onChange={set('password_confirmation')}
              className="w-full border border-[#E8E2D6] rounded-[12px] px-4 py-3 text-sm focus:outline-none focus:border-[#2E5339]" />
          </div>

          {error && <div className="text-sm text-[#B0413E] bg-[#F6E3E2] border border-[#E5B9B6] rounded-[10px] px-3 py-2">{error}</div>}

          <button
            disabled={busy}
            className="w-full py-3 rounded-[12px] bg-[#2E5339] text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-xs text-[#5C5C5C] mt-4 text-center">
          Already have an account? <Link to="/login" className="text-[#2E5339] font-semibold underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
