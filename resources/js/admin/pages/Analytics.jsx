import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { PageHeader, CardSkeleton, EmptyState, Icon } from '../../shared/ui'

function Peso({ n }) {
  return <>{Number(n).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</>
}

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled']
const statusTone = k =>
  k === 'pending' ? 'bg-[#FFF4D6] border-[#F2D98A] text-[#8A6A0A]'
  : k === 'confirmed' || k === 'preparing' ? 'bg-[#E8F0E9] border-[#C5D9C7] text-[#4A7C59]'
  : k === 'ready' || k === 'delivered' || k === 'completed' ? 'bg-[#2E5339] border-[#2E5339] text-white'
  : 'bg-[#FDEDEC] border-[#E8C6C6] text-[#B0413E]'

function KpiCard({ label, value, hint, tone = 'text-[#1A1A1A]', icon }) {
  return (
    <div className="bg-white rounded-[12px] border border-[#E8E2D6] p-5 shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">{label}</div>
        <span className="w-8 h-8 rounded-full bg-[#E8F0E9] text-[#2E5339] grid place-items-center shrink-0">
          <Icon name={icon} className="w-4 h-4" />
        </span>
      </div>
      <div className={`mt-2 text-xl font-semibold ${tone}`}>{value}</div>
      <div className="text-xs text-[#8A8A8A] mt-1">{hint}</div>
    </div>
  )
}

export default function Analytics() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({ queryKey: ['admin-analytics'], queryFn: api.analytics })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Platform analytics" desc="Marketplace health at a glance — sales, active farmers, and the order queue." />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => <CardSkeleton key={i} rows={1} />)}
        </div>
        <CardSkeleton rows={4} />
      </div>
    )
  }
  if (error) return <div className="p-6 text-[#B0413E]">Failed: {error.message} <button onClick={() => refetch()} className="underline">Retry</button></div>

  const a = data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform analytics"
        desc="Marketplace health at a glance — sales, active farmers, and the order queue."
      >
        <button onClick={() => refetch()} disabled={isFetching}
          className="h-9 px-4 rounded-full border border-[#E8E2D6] bg-white text-sm font-medium hover:bg-[#FAF8F3] inline-flex items-center gap-2 disabled:opacity-60 transition">
          <Icon name="refresh" className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </PageHeader>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="GMV (ex-cancelled)" icon="analytics" value={<Peso n={a.gmv} />} hint={`${a.total_orders} orders`} />
        <KpiCard
          label="Active farmers" icon="sprout"
          value={a.active_farmers}
          tone={a.pending_verifications > 0 ? 'text-[#B0413E]' : 'text-[#1A1A1A]'}
          hint={`${a.pending_verifications} pending verification${a.pending_verifications === 1 ? '' : 's'}`}
        />
        <KpiCard label="Available products" icon="inventory" value={`${a.available_products} / ${a.total_products}`} hint={`${a.buyers} buyers · ${a.total_users} users`} />
        <div className="bg-white rounded-[12px] border border-[#E8E2D6] p-5 shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
          <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Orders by status</div>
          <div className="mt-2 flex flex-wrap gap-1.5 min-h-[30px]">
            {Object.entries(a.by_status || {}).length ? Object.entries(a.by_status).sort((x, y) => STATUS_FLOW.indexOf(x[0]) - STATUS_FLOW.indexOf(y[0])).map(([k, v]) => (
              <span key={k} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold capitalize ${statusTone(k)}`}>
                {k} <span className="opacity-80">· {v}</span>
              </span>
            )) : <span className="text-sm text-[#8A8A8A]">—</span>}
          </div>
          <div className="text-xs text-[#8A8A8A] mt-2">Pending → completed queue</div>
        </div>
      </div>

      {/* 7-day GMV */}
      <div className="bg-white rounded-[12px] border border-[#E8E2D6] p-6 shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
        <h2 className="font-semibold">Last 7 days — GMV &amp; order count</h2>
        <p className="text-xs text-[#8A8A8A] mt-0.5">The gold bar marks the strongest sales day of the week.</p>
        <div className="mt-4 overflow-x-auto">
          <div className="flex items-end gap-2 h-[180px] min-w-[520px] border-l border-b border-[#E8E2D6] pl-2 pb-2">
            {(a.orders_by_day || []).map(row => {
              const max = Math.max(...(a.orders_by_day.map(r => Number(r.gmv))), 1)
              const h = Math.max(8, (Number(row.gmv) / max) * 110)
              const isPeak = Number(row.gmv) === max
              return (
                <div key={row.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs text-[#8A8A8A]">{Number(row.count)} order{Number(row.count) === 1 ? '' : 's'}</div>
                  <div className={`w-full rounded-t-[8px] transition-all ${isPeak ? 'bg-[#D4A017] ring-2 ring-[#FFF4D6]' : 'bg-[#2E5339] hover:bg-[#4A7C59]'}`} style={{ height: h }} title={`${row.date}: ${row.gmv}`} />
                  <div className="text-[11px] text-[#8A8A8A]">{row.date?.slice(5)}</div>
                </div>
              )
            })}
            {(!a.orders_by_day || a.orders_by_day.length === 0) && <div className="text-sm text-[#8A8A8A]">No orders in the last 7 days yet.</div>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[12px] border border-[#E8E2D6] p-6 shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
          <h3 className="font-semibold">GMV by category</h3>
          <div className="mt-3 space-y-2">
            {(a.gmv_by_category || []).map(r => (
              <div key={r.category} className="flex items-center gap-3">
                <div className="w-20 text-sm text-[#5C5C5C] truncate">{r.category}</div>
                <div className="flex-1 h-2 rounded-full bg-[#E8F0E9] overflow-hidden">
                  <div className="h-full bg-[#4A7C59] rounded-full" style={{ width: `${Math.min(100, (Number(r.gmv) / Math.max(...a.gmv_by_category.map(x => Number(x.gmv)), 1)) * 100)}%` }} />
                </div>
                <div className="text-sm font-medium"><Peso n={r.gmv} /></div>
              </div>
            ))}
            {(!a.gmv_by_category || a.gmv_by_category.length === 0) && <div className="text-sm text-[#8A8A8A]">No sales recorded yet.</div>}
          </div>
        </div>
        <div className="bg-white rounded-[12px] border border-[#E8E2D6] p-6 shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
          <h3 className="font-semibold">Top farmers by GMV</h3>
          <div className="mt-3 divide-y divide-[#F0EDE6]">
            {(a.top_farmers || []).map((r, i) => (
              <div key={i} className="flex items-center justify-between py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-[#D4A017] text-[#1A1A1A]' : 'bg-[#E8F0E9] text-[#2E5339]'}`}>{i + 1}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.farmer} <span className="text-xs text-[#8A8A8A]">· {r.farm_name}</span></div>
                    <div className="text-xs text-[#8A8A8A]">{r.orders} order{Number(r.orders) === 1 ? '' : 's'}</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-[#2E5339]"><Peso n={r.gmv} /></div>
              </div>
            ))}
            {(!a.top_farmers || a.top_farmers.length === 0) && <div className="text-sm text-[#8A8A8A] py-2">No farmer sales yet.</div>}
          </div>
        </div>
      </div>

      <div className="rounded-[12px] bg-[#FFF4D6] border border-[#F2D98A] p-4">
        <div className="text-sm font-semibold text-[#8A6A0A] flex items-center gap-2"><Icon name="analytics" className="w-4 h-4" /> AniPredict — coming soon</div>
        <div className="text-xs text-[#8A6A0A] leading-5 mt-0.5">
          Once enough order and price history builds up, this space will forecast the best window to sell each crop — highlighted in Harvest Gold, just like the peak bar above.
        </div>
      </div>
    </div>
  )
}
