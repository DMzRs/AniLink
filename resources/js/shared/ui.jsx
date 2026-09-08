// Shared presentational primitives for the AniLink Admin + AniManage SPAs.
// Tokens mirror DESIGN.md: Forest Green #2E5339, Harvest Gold #D4A017, warm #FAF8F3.

const ICON_PATHS = {
  analytics: (
    <>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" />
      <path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
    </>
  ),
  badge: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  grid: (
    <>
      <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  inventory: (
    <>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
    </>
  ),
  orders: (
    <>
      <rect width="8" height="4" x="8" y="2" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />
    </>
  ),
  search: (<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>),
  refresh: (
    <>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" />
    </>
  ),
  alert: (<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></>),
  inbox: (<><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>),
  sprout: (
    <>
      <path d="M7 20h10" /><path d="M10 20c5.5-2.5.8-6.4 3-10" />
      <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
      <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
    </>
  ),
  logout: (<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>),
}

export function Icon({ name, className = 'w-5 h-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" className={className} aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  )
}

export function PageHeader({ title, desc, children }) {
  if (typeof document !== 'undefined') document.title = `${title} · AniLink`
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {desc && <p className="text-sm text-[#5C5C5C] mt-1 max-w-[64ch] leading-6">{desc}</p>}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-[#EFEAE0] ${className}`} />
}

export function CardSkeleton({ rows = 3, className = '' }) {
  return (
    <div className={`bg-white rounded-[12px] border border-[#E8E2D6] p-5 space-y-3 ${className}`} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ icon = 'inbox', title, hint }) {
  return (
    <div className="bg-white rounded-[12px] border border-[#E8E2D6] p-10 text-center">
      <div className="w-12 h-12 mx-auto rounded-full bg-[#E8F0E9] text-[#2E5339] grid place-items-center">
        <Icon name={icon} />
      </div>
      <div className="mt-3 font-semibold">{title}</div>
      {hint && <div className="mt-1 text-sm text-[#8A8A8A]">{hint}</div>}
    </div>
  )
}

// Pill tones per DESIGN.md status colors (order states + verification + product status).
export const chipTone = {
  pending: 'bg-[#FFF4D6] border-[#F2D98A] text-[#8A6A0A]',
  unverified: 'bg-[#FFF4D6] border-[#F2D98A] text-[#8A6A0A]',
  confirmed: 'bg-[#E8F0E9] border-[#C5D9C7] text-[#4A7C59]',
  preparing: 'bg-[#E8F0E9] border-[#C5D9C7] text-[#4A7C59]',
  approved: 'bg-[#E8F0E9] border-[#C5D9C7] text-[#2E5339]',
  available: 'bg-[#E8F0E9] border-[#C5D9C7] text-[#2E5339]',
  verified: 'bg-[#E8F0E9] border-[#C5D9C7] text-[#2E5339]',
  ready: 'bg-[#2E5339] border-[#2E5339] text-white',
  delivered: 'bg-[#2E5339] border-[#2E5339] text-white',
  completed: 'bg-[#2E5339] border-[#2E5339] text-white',
  cancelled: 'bg-[#FDEDEC] border-[#E8C6C6] text-[#B0413E]',
  rejected: 'bg-[#FDEDEC] border-[#E8C6C6] text-[#B0413E]',
  archived: 'bg-[#FDEDEC] border-[#E8C6C6] text-[#B0413E]',
  sold_out: 'bg-[#FFF4D6] border-[#F2D98A] text-[#8A6A0A]',
}

export function Chip({ tone = 'pending', className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold capitalize ${chipTone[tone] || 'bg-white border-[#E8E2D6] text-[#5C5C5C]'} ${className}`}>
      {children}
    </span>
  )
}
