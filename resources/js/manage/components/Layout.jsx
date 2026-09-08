import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Icon } from '../../shared/ui'

const nav = [
  { to: '/', label: 'Inventory', icon: 'inventory', desc: 'Stock • price • harvest' },
  { to: '/orders', label: 'Orders', icon: 'orders', desc: 'Pending → completed' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navgo = useNavigate()
  const farm = user?.farmerProfile?.farm_name || user?.name || '—'
  const verified = user?.farmerProfile?.verification_status === 'approved'

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#1A1A1A] flex">
      {/* Sidebar — Forest Green primary */}
      <aside className="w-[280px] shrink-0 bg-[#2E5339] text-white flex flex-col sticky top-0 h-screen">
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src="/apple-touch-icon-180.png" alt="" className="w-9 h-9 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.25)]" />
            <div>
              <div className="font-semibold leading-none">AniManage</div>
              <div className="text-xs opacity-70 mt-0.5">AniLink for farmers</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`text-[11px] px-2 py-1 rounded-full border font-semibold ${verified ? 'bg-[#E8F0E9] border-[#C5D9C7] text-[#2E5339]' : 'bg-[#FFF4D6] border-[#F2D98A] text-[#8A6A0A]'}`}>
              {verified ? '✓ Verified farm' : '○ Verification pending'}
            </span>
            <span className="text-[11px] px-2 py-1 rounded-full bg-white/10 border border-white/10">🔒 2FA on</span>
          </div>
          <div className="mt-3 text-xs leading-4 opacity-80 truncate">{farm} · {user?.farmerProfile?.barangay || ''} {user?.farmerProfile?.municipality || ''}</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}>
              {({ isActive }) => (
                <span className={`flex items-center gap-3 px-3 py-3 rounded-[12px] transition ${isActive ? 'bg-white text-[#2E5339] font-semibold shadow-[0_4px_12px_rgba(0,0,0,0.12)]' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${isActive ? 'bg-[#D4A017] text-[#1A1A1A]' : 'bg-white/10'}`}>
                    <Icon name={n.icon} className="w-[18px] h-[18px]" />
                  </span>
                  <span className="leading-none">
                    <span className="block text-sm">{n.label}</span>
                    <span className="block text-[11px] opacity-70 mt-1">{n.desc}</span>
                  </span>
                </span>
              )}
            </NavLink>
          ))}
          <div className="mt-4 mx-3 rounded-[12px] bg-white/10 p-3 border border-white/10">
            <div className="text-xs font-semibold">🧺 Tip</div>
            <div className="text-xs leading-4 opacity-80 mt-1">Your stock and orders stay in sync with the AniLink mobile app — update here or on your phone.</div>
          </div>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="bg-white/10 rounded-[12px] p-3">
            <div className="text-sm font-medium truncate">{user?.name}</div>
            <div className="text-xs opacity-70 truncate">{user?.email}</div>
            <button onClick={() => { logout(); navgo('/login') }}
              className="mt-3 w-full h-9 rounded-full bg-[#D4A017] text-[#1A1A1A] text-sm font-semibold hover:bg-[#E8B520] transition inline-flex items-center justify-center gap-2">
              <Icon name="logout" className="w-4 h-4" /> Sign out
            </button>
          </div>
          <div className="mt-3 text-[11px] opacity-60">Cultivating Connection, Harvesting Fair Trades.</div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col bg-[#FAF8F3]">
        <header className="sticky top-0 z-10 bg-white border-b border-[#E8E2D6] px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-semibold">AniManage</span>
            <span className="hidden md:inline text-xs text-[#8A8A8A] truncate">{farm}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#8A8A8A] shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#4A7C59] animate-pulse" />
            Live
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8 max-w-[1360px] w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}
