import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useState } from 'react'
import { PageHeader, CardSkeleton, EmptyState, Chip } from '../../shared/ui'

const fmtPeso = (n) => Number(n).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })

const next = { pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'delivered', delivered: 'completed' }
const nextLabel = { pending: 'Confirm', confirmed: 'Prepare', preparing: 'Mark ready', ready: 'Deliver', delivered: 'Complete' }
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Order queue" desc="Every order in one place — buyers get a notification at each step." />
        <CardSkeleton rows={4} />
      </div>
    )
  }
  if (error) return <div className="p-6 text-[#B0413E]">{error.message}</div>

  const counts = filters.reduce((acc,f)=>{acc[f]= f==='all'? list.length : list.filter(o=>o.status===f).length; return acc}, {})

  return (
    <div className="space-y-4">
      <PageHeader title="Order queue" desc="Every order in one place — buyers get a notification at each step.">
        <span className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-[#2E5339] text-white font-medium"><span className="w-2 h-2 rounded-full bg-[#D4A017] animate-pulse" /> Live</span>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button key={f} onClick={()=>setFilter(f)} className={`h-8 px-3 rounded-full border text-xs capitalize transition ${filter===f ? 'bg-[#2E5339] text-white border-[#2E5339] font-semibold' : 'bg-white border-[#E8E2D6] hover:bg-[#FAF8F3]'}`}>
            {f} {counts[f] ? `· ${counts[f]}` : ''}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {list.map(o => (
          <div key={o.id} className="bg-white rounded-[12px] border border-[#E8E2D6] p-5 flex flex-col lg:flex-row gap-4 shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">Order #{o.id}</span>
                <Chip tone={o.status}>{o.status}</Chip>
                <span className="text-xs text-[#8A8A8A]">{o.order_type === 'bulk' ? 'Bulk' : 'Retail'} · {o.fulfillment_type} · <span className="font-semibold text-[#2E5339]">{fmtPeso(o.total_amount)}</span></span>
              </div>
              <div className="text-sm text-[#5C5C5C] mt-1">Buyer: <span className="font-medium text-[#1A1A1A]">{o.buyer?.name || `Buyer #${o.buyer_id}`}</span> · {new Date(o.created_at).toLocaleString('en-PH')} {o.delivery_address ? `· ${o.delivery_address}` : ''}</div>
              <div className="mt-2 bg-[#FAF8F3] rounded-[8px] p-3 space-y-1">
                {(o.items || []).map((it,i)=>(
                  <div key={i} className="flex justify-between text-sm gap-4">
                    <span className="text-[#5C5C5C] truncate pr-2">{it.product_name} · {it.quantity} × {fmtPeso(it.unit_price)}</span>
                    <span className="font-medium whitespace-nowrap">{fmtPeso(it.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex lg:flex-col gap-2 lg:w-[180px] shrink-0">
              {next[o.status] && (
                <button disabled={isPending} onClick={()=>mutate({ id: o.id, status: next[o.status] })} className="flex-1 lg:flex-none h-11 rounded-full bg-[#2E5339] text-white text-sm font-semibold hover:bg-[#24412D] disabled:opacity-60 transition">
                  {nextLabel[o.status]} →
                </button>
              )}
              {o.status==='pending' && (
                <button disabled={isPending} onClick={()=>mutate({ id: o.id, status: 'cancelled' })} className="h-11 rounded-full border border-[#E8C6C6] text-[#B0413E] text-sm font-semibold bg-white hover:bg-[#FDEDEC] disabled:opacity-60 transition">Cancel</button>
              )}
              <div className="hidden lg:block text-xs text-[#8A8A8A] text-center">One tap, no modal</div>
            </div>
          </div>
        ))}
        {!isLoading && list.length===0 && (
          <EmptyState icon="orders" title={filter!=='all' ? `No ${filter} orders` : 'No orders yet'} hint="New orders from the AniMarket app will land here." />
        )}
      </div>
    </div>
  )
}
