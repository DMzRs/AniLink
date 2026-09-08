import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

function Peso({ n }) {
  return <>{Number(n).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</>
}

export default function Analytics() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({ queryKey: ['admin-analytics'], queryFn: api.analytics })

  if (isLoading) return <div className="p-6">Loading analytics…</div>
  if (error) return <div className="p-6 text-[#B0413E]">Failed: {error.message} <button onClick={() => refetch()} className="underline">Retry</button></div>

  const a = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Platform analytics</h1>
          <p className="text-sm text-[#5C5C5C]">GMV, active farmers, order volume —desktop web-oriented, Harvest Gold accent on recommended window.</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching} className="h-9 px-4 rounded-full border border-[#E8E2D6] bg-white text-sm font-medium hover:bg-[#FAF8F3]">{isFetching ? 'Refreshing…' : 'Refresh'}</button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'GMV (ex-cancelled)', value: <Peso n={a.gmv} />, sub: `${a.total_orders} orders` },
          { label: 'Active farmers', value: a.active_farmers, sub: `${a.pending_verifications} pending verification`, accent: a.pending_verifications > 0 },
          { label: 'Available products', value: `${a.available_products} / ${a.total_products}`, sub: `${a.buyers} buyers · ${a.total_users} users` },
          { label: 'Orders by status', value: Object.entries(a.by_status || {}).map(([k,v]) => `${k}:${v}`).join(' · ') || '—', sub: 'Pending → Completed queue' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-[12px] border border-[#E8E2D6] p-5 shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
            <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">{card.label}</div>
            <div className={`mt-2 text-xl font-semibold ${card.accent ? 'text-[#B0413E]' : 'text-[#1A1A1A]'}`}>{card.value}</div>
            <div className="text-xs text-[#8A8A8A] mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* 7-day GMV */}
      <div className="bg-white rounded-[12px] border border-[#E8E2D6] p-6">
        <h2 className="font-semibold">Last 7 days — GMV & order count</h2>
        <p className="text-xs text-[#8A8A8A]">Muted gridlines, Harvest Gold recommended window. From <code>orders</code> + <code>price_trends</code> per spec §4 (left last until real data exists).</p>
        <div className="mt-4 overflow-x-auto">
          <div className="flex items-end gap-2 h-[160px] min-w-[520px] border-l border-b border-[#E8E2D6] pl-2 pb-2">
            {(a.orders_by_day || []).map(row => {
              const max = Math.max(...(a.orders_by_day.map(r => Number(r.gmv)) ), 1)
              const h = Math.max(8, (Number(row.gmv) / max) * 120)
              const isPeak = Number(row.gmv) === max
              return (
                <div key={row.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs text-[#8A8A8A]">{Number(row.count)} orders</div>
                  <div className={`w-full rounded-t-[8px] ${isPeak ? 'bg-[#D4A017] ring-2 ring-[#FFF4D6]' : 'bg-[#2E5339]'}`} style={{ height: h }} title={`${row.date}: ${row.gmv}`} />
                  <div className="text-[11px] text-[#8A8A8A]">{row.date?.slice(5)}</div>
                </div>
              )
            })}
            {(!a.orders_by_day || a.orders_by_day.length===0) && <div className="text-sm text-[#8A8A8A]">No orders yet — seed has 7 days of demo data after migrate.</div>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[12px] border border-[#E8E2D6] p-6">
          <h3 className="font-semibold">GMV by category</h3>
          <div className="mt-3 space-y-2">
            {(a.gmv_by_category || []).map(r => (
              <div key={r.category} className="flex items-center gap-3">
                <div className="w-20 text-sm text-[#5C5C5C]">{r.category}</div>
                <div className="flex-1 h-2 rounded-full bg-[#E8F0E9] overflow-hidden">
                  <div className="h-full bg-[#4A7C59]" style={{ width: `${Math.min(100, (Number(r.gmv)/Math.max(...a.gmv_by_category.map(x=>Number(x.gmv)),1))*100)}%` }} />
                </div>
                <div className="text-sm font-medium"><Peso n={r.gmv} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-[12px] border border-[#E8E2D6] p-6">
          <h3 className="font-semibold">Top farmers by GMV</h3>
          <div className="mt-3 divide-y divide-[#F0EDE6]">
            {(a.top_farmers || []).map((r,i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">{r.farmer} <span className="text-xs text-[#8A8A8A]">· {r.farm_name}</span></div>
                  <div className="text-xs text-[#8A8A8A]">{r.orders} orders</div>
                </div>
                <div className="text-sm font-semibold text-[#2E5339]"><Peso n={r.gmv} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[12px] bg-[#FFF4D6] border border-[#F2D98A] p-4">
        <div className="text-sm font-semibold text-[#8A6A0A]">AniPredict note — Harvest Gold window</div>
        <div className="text-xs text-[#8A6A0A] leading-5">Trend chart muted gridlines, peak bar in Harvest Gold marks “best time to sell” per DESIGN.md:64. Forecast left last per build order until real order/price data exists — this chart is 7-day GMV placeholder.</div>
      </div>
    </div>
  )
}
