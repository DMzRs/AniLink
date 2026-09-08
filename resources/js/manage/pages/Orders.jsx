import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useState } from 'react'

const fmtPeso = (n) => Number(n).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })

const statusTone = {
  pending: 'bg-[#FFF4D6] border-[#F2D98A] text-[#8A6A0A]',
  confirmed: 'bg-[#E8F0E9] border-[#C5D9C7] text-[#2E5339]',
  preparing: 'bg-[#E8F0E9] border-[#C5D9C7] text-[#2E5339]',
  ready: 'bg-[#2E5339] border-[#2E5339] text-white',
  delivered: 'bg-[#2E5339] border-[#2E5339] text-white',
  completed: 'bg-[#2E5339] border-[#2E5339] text-white',
  cancelled: 'bg-[#FDEDEC] border-[#E8C6C6] text-[#B0413E]',
}

const next = { pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'delivered', delivered: 'completed' }
const nextLabel = { pending: 'Confirm', confirmed: 'Prepare', preparing: 'Ready', ready: 'Deliver', delivered: 'Complete' }
const filters = ['all','pending','confirmed','preparing','ready','delivered','completed','cancelled']

export default function Orders() {
  const [filter, setFilter] = useState('all')
  const qc = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ['manage-orders', filter],
    queryFn: () => api.orders({ status: filter==='all'? undefined : filter }),
  })

  const orders = data?.data ?? data ?? []
  const list = Array.isArray(orders) ? orders : []

  const { mutate, isPending } = useMutation({
    mutationFn: ({ id, status }) => api.updateOrderStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['manage-orders'] }),
  })

  if (isLoading) return <div className="p-6">Loading order queue…</div>
  if (error) return <div className="p-6 text-[#B0413E]">{error.message}</div>

  const counts = filters.reduce((acc,f)=>{acc[f]= f==='all'? list.length : list.filter(o=>o.status===f).length; return acc}, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Order queue</h1>
          <p className="text-sm text-[#5C5C5C]">Real-time: Pending → Confirmed → Preparing → Ready → Delivered/Completed — same <code>PATCH /api/orders/:id/status</code> as mobile.</p>
        </div>
        <span className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-[#2E5339] text-white"><span className="w-2 h-2 rounded-full bg-[#D4A017] animate-pulse" /> Live</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button key={f} onClick={()=>setFilter(f)} className={`h-8 px-3 rounded-full border text-xs capitalize ${filter===f ? 'bg-[#2E5339] text-white border-[#2E5339] font-semibold' : 'bg-white border-[#E8E2D6] hover:bg-[#FAF8F3]'}`}>
            {f} {counts[f] ? `· ${counts[f]}` : ''}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {list.map(o => (
          <div key={o.id} className="bg-white rounded-[12px] border border-[#E8E2D6] p-5 flex flex-col lg:flex-row gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">Order #{o.id}</span>
                <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${statusTone[o.status] || 'bg-white border-[#E8E2D6]'}`}>{o.status}</span>
                <span className="text-xs text-[#8A8A8A]">{o.order_type === 'bulk' ? 'Bulk' : 'Retail'} · {o.fulfillment_type} · {fmtPeso(o.total_amount)}</span>
              </div>
              <div className="text-sm text-[#5C5C5C] mt-1">Buyer: <span className="font-medium text-[#1A1A1A]">{o.buyer?.name || `Buyer #${o.buyer_id}`}</span> · {new Date(o.created_at).toLocaleString('en-PH')} {o.delivery_address ? `· ${o.delivery_address}` : ''}</div>
              <div className="mt-2 bg-[#FAF8F3] rounded-[8px] p-3 space-y-1">
                {(o.items || []).map((it,i)=>(
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-[#5C5C5C] truncate pr-4">{it.product_name} · {it.quantity} × {fmtPeso(it.unit_price)}</span>
                    <span className="font-medium">{fmtPeso(it.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex lg:flex-col gap-2 lg:w-[180px] shrink-0">
              {next[o.status] && (
                <button disabled={isPending} onClick={()=>mutate({ id: o.id, status: next[o.status] })} className="flex-1 lg:flex-none h-11 rounded-full bg-[#2E5339] text-white text-sm font-semibold hover:bg-[#24412D] disabled:opacity-60">
                  {nextLabel[o.status]} →
                </button>
              )}
              {o.status==='pending' && (
                <button disabled={isPending} onClick={()=>mutate({ id: o.id, status: 'cancelled' })} className="h-11 rounded-full border border-[#E8C6C6] text-[#B0413E] text-sm font-semibold bg-white hover:bg-[#FDEDEC]">Cancel</button>
              )}
              <div className="hidden lg:block text-xs text-[#8A8A8A] text-center">One-tap, no modal</div>
            </div>
          </div>
        ))}
        {list.length===0 && <div className="bg-white rounded-[12px] border border-[#E8E2D6] p-10 text-center text-[#8A8A8A]">No {filter!=='all'?filter:''} orders.</div>}
      </div>
    </div>
  )
}
