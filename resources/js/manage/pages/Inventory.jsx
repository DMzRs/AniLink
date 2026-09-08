import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useState } from 'react'
import { PageHeader, CardSkeleton, EmptyState, Chip, Icon } from '../../shared/ui'

const fmtPeso = (n) => Number(n).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })

function StockStepper({ value, unit, onDelta, loading }) {
  return (
    <div className="flex items-center rounded-full border border-[#E8E2D6] bg-white overflow-hidden h-11">
      <button disabled={loading} onClick={() => onDelta(-1)} aria-label="Remove one" className="w-11 h-full bg-[#FAF8F3] hover:bg-[#E8E2D6] disabled:opacity-40 text-lg font-semibold transition">−</button>
      <div className="flex-1 text-center leading-none">
        <div className={`font-semibold ${Number(value) <= 5 ? 'text-[#B0413E]' : 'text-[#1A1A1A]'}`}>{value}</div>
        <div className="text-[11px] text-[#8A8A8A] -mt-1">{unit}</div>
      </div>
      <button disabled={loading} onClick={() => onDelta(1)} aria-label="Add one" className="w-11 h-full bg-[#2E5339] hover:bg-[#24412D] disabled:opacity-40 text-white text-lg font-semibold transition">+</button>
    </div>
  )
}

export default function Inventory() {
  const qc = useQueryClient()
  const [updating, setUpdating] = useState(null)

  const { data: prodRes, isLoading, error } = useQuery({ queryKey: ['farmer-products'], queryFn: () => api.farmerProducts() })
  const { data: ordersRes } = useQuery({ queryKey: ['farmer-orders'], queryFn: () => api.orders() })

  const products = prodRes?.data ?? prodRes ?? []
  const orders = Array.isArray(ordersRes?.data) ? ordersRes.data : (ordersRes ?? [])

  const lowStock = products.filter(p => Number(p.available_quantity) <= 5 && p.status !== 'archived')
  const todayStr = new Date().toDateString()
  const daily = orders.filter(o => new Date(o.created_at).toDateString() === todayStr && o.status !== 'cancelled').reduce((s,o)=>s+Number(o.total_amount||0),0)
  const weekly = orders.filter(o => new Date(o.created_at).getTime() > Date.now()-7*86400000 && o.status!=='cancelled').reduce((s,o)=>s+Number(o.total_amount||0),0)
  const pending = orders.filter(o=>o.status==='pending').length

  const adjust = useMutation({
    mutationFn: ({ id, delta }) => api.adjustStock(id, delta, delta>0 ? 'restock' : 'adjustment'),
    onMutate: async ({ id, delta }) => {
      setUpdating(id)
      await qc.cancelQueries({ queryKey: ['farmer-products'] })
      const prev = qc.getQueryData(['farmer-products'])
      qc.setQueryData(['farmer-products'], old => {
        const list = old?.data ?? old ?? []
        const next = list.map(p => p.id===id ? { ...p, available_quantity: Math.max(0, Number(p.available_quantity)+delta), status: Math.max(0, Number(p.available_quantity)+delta)===0 ? 'sold_out' : p.status } : p)
        return old?.data ? { ...old, data: next } : next
      })
      return { prev }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['farmer-products'], ctx.prev) },
    onSettled: () => { setUpdating(null); qc.invalidateQueries({ queryKey: ['farmer-products'] }) },
  })

  const toggleSoldOut = useMutation({
    mutationFn: ({ id, soldOut }) => soldOut ? api.updateProduct(id, { status: 'archived' }) : api.adjustStock(id, 10, 'restock'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['farmer-products'] }),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Inventory" desc="One-tap stock updates — everything syncs with the AniLink mobile app." />
        <div className="grid md:grid-cols-3 gap-4">{[0,1,2].map(i => <CardSkeleton key={i} rows={1} />)}</div>
        <CardSkeleton rows={4} />
      </div>
    )
  }
  if (error) return <div className="p-6 text-[#B0413E]">Failed: {error.message}</div>

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" desc="One-tap stock updates — everything syncs with the AniLink mobile app." />

      {/* Sales summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-[12px] border border-[#E8E2D6] p-5 shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Daily sales</div>
            <span className="w-8 h-8 rounded-full bg-[#E8F0E9] text-[#2E5339] grid place-items-center shrink-0"><Icon name="analytics" className="w-4 h-4" /></span>
          </div>
          <div className="mt-1 text-xl font-semibold text-[#2E5339]">{fmtPeso(daily)}</div>
          <div className="text-xs text-[#8A8A8A]">{pending} pending order{pending === 1 ? '' : 's'}</div>
        </div>
        <div className="bg-white rounded-[12px] border border-[#E8E2D6] p-5 shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Weekly totals</div>
            <span className="w-8 h-8 rounded-full bg-[#E8F0E9] text-[#2E5339] grid place-items-center shrink-0"><Icon name="orders" className="w-4 h-4" /></span>
          </div>
          <div className="mt-1 text-xl font-semibold">{fmtPeso(weekly)}</div>
          <div className="text-xs text-[#8A8A8A]">Last 7 days of sales</div>
        </div>
        <div className="bg-[#FFF4D6] rounded-[12px] border border-[#F2D98A] p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A6A0A]">Low-stock alerts</div>
            <span className="w-8 h-8 rounded-full bg-white/70 text-[#8A6A0A] grid place-items-center shrink-0"><Icon name="alert" className="w-4 h-4" /></span>
          </div>
          <div className="mt-1 text-xl font-semibold text-[#8A6A0A]">{lowStock.length} item{lowStock.length === 1 ? '' : 's'}</div>
          <div className="text-xs text-[#8A6A0A] truncate">≤5 left: {lowStock.map(p=>p.name).join(', ') || 'none — all good'}</div>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-[#FDEDEC] rounded-[12px] border border-[#E8C6C6] p-4 flex flex-wrap gap-2 items-center">
          <span className="text-sm font-semibold text-[#B0413E] inline-flex items-center gap-2"><Icon name="alert" className="w-4 h-4" /> Low stock:</span>
          {lowStock.map(p => (
            <span key={p.id} className="inline-flex items-center gap-2 bg-white rounded-full border border-[#E8C6C6] px-3 py-1 text-sm">
              {p.name} — {p.available_quantity} {p.unit_type}
              <button onClick={()=>adjust.mutate({ id: p.id, delta: 10 })} className="h-7 px-3 rounded-full bg-[#2E5339] text-white text-xs font-semibold hover:bg-[#24412D] transition">+10</button>
            </span>
          ))}
        </div>
      )}

      {/* Listings table */}
      <div className="bg-white rounded-[12px] border border-[#E8E2D6] overflow-hidden shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAF8F3] text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">
              <tr><th className="text-left px-4 py-3">Product</th><th className="text-left px-4 py-3">Category · Price</th><th className="text-left px-4 py-3">Stock</th><th className="text-left px-4 py-3">Adjust</th><th className="text-right px-4 py-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-[#F0EDE6]">
              {products.map(p => {
                const soldOut = p.status === 'sold_out' || Number(p.available_quantity) === 0
                return (
                  <tr key={p.id} className={`${soldOut ? 'bg-[#FFFBFB]' : 'hover:bg-[#FAF8F3]/60'} transition`}>
                    <td className="px-4 py-3">
                      <div className="font-medium flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-[#E8F0E9] flex items-center justify-center text-sm shrink-0" aria-hidden="true">🥬</span>
                        {p.name} {p.status === 'archived' && <Chip tone="archived" className="!py-0.5">Archived</Chip>}
                      </div>
                      <div className="text-xs text-[#8A8A8A] mt-0.5">Harvest {p.harvest_date || '—'} · {p.status.replace('_', ' ')}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-[#2E5339]">{fmtPeso(p.price_per_unit)} / {p.unit_type}</div>
                      <div className="text-xs text-[#8A8A8A]">{p.category?.name} {p.bulk_price ? `· Bulk ${fmtPeso(p.bulk_price)} @ ${p.min_bulk_quantity}+` : ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Chip tone={Number(p.available_quantity) <= 5 ? 'cancelled' : 'available'}>
                        {p.available_quantity} {p.unit_type}
                      </Chip>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-[200px]">
                        <StockStepper value={Number(p.available_quantity)} unit={p.unit_type} loading={updating===p.id} onDelta={(d)=>adjust.mutate({ id: p.id, delta: d })} />
                        <div className="text-[11px] text-[#8A8A8A] text-center mt-1">One tap — no modal</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={()=>toggleSoldOut.mutate({ id: p.id, soldOut: !soldOut })} className={`h-9 px-3 rounded-full text-xs font-semibold border transition ${soldOut ? 'bg-[#2E5339] text-white border-[#2E5339] hover:bg-[#24412D]' : 'bg-white border-[#E8C6C6] text-[#B0413E] hover:bg-[#FDEDEC]'}`}>
                        {soldOut ? 'Restock +10' : 'Mark sold out'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {products.length===0 && (
          <div className="p-2">
            <EmptyState icon="sprout" title="No listings yet" hint="Add your first harvest from the AniLink mobile app and it will show up here." />
          </div>
        )}
      </div>
    </div>
  )
}
