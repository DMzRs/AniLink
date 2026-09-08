import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const nav = [
  { to: '/', label: 'Analytics', icon: '◈' },
  { to: '/verifications', label: 'Verifications', icon: '✓' },
  { to: '/listings', label: 'Listings', icon: '▦' },
  { to: '/users', label: 'Users', icon: '○' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navgo = useNavigate()
  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#1A1A1A] font-[Inter] flex">
      {/* Sidebar — Forest Green primary, desktop not mobile */}
      <aside className="w-[260px] shrink-0 bg-[#2E5339] text-white flex flex-col sticky top-0 h-screen">
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#2E5339] font-bold">A</div>
            <div>
              <div className="font-semibold leading-none">AniLink</div>
              <div className="text-xs opacity-70">Admin</div>
            </div>
          </div>
          <div className="mt-3 text-xs leading-4 opacity-80">Cultivating Connection, Harvesting Fair Trades.</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to==='/'}
              className={({isActive}) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${isActive ? 'bg-white text-[#2E5339] font-semibold' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
              <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-sm font-medium truncate">{user?.name ?? 'Admin'}</div>
            <div className="text-xs opacity-70 truncate">{user?.email ?? 'admin@anilink.test'}</div>
            <button onClick={() => { logout(); navgo('/login') }} className="mt-3 w-full h-9 rounded-full bg-[#D4A017] text-[#1A1A1A] text-sm font-semibold hover:bg-[#E8B520]">Sign out</button>
          </div>
          <div className="mt-3 text-[11px] leading-4 opacity-60">Forest Green #2E5339 · Harvest Gold #D4A017 · Verified + 2FA trust signals</div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-10 bg-white border-b border-[#E8E2D6] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#D4A017] animate-pulse" />
            <span className="text-sm font-medium">Admin Panel — <span className="text-[#5C5C5C]">desktop, not mobile</span></span>
            <span className="hidden md:inline text-xs px-2 py-1 rounded-full bg-[#FFF4D6] border border-[#F2D98A] text-[#8A6A0A]">Web-oriented screens</span>
          </div>
          <div className="text-xs text-[#8A8A8A]">© AniLink Cooperative</div>
        </header>
        <main className="flex-1 p-6 lg:p-8 max-w-[1280px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
