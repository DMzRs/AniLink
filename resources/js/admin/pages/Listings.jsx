import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useState } from 'react'

export default function Listings() {
  const [filter, setFilter] = useState('available')
  const [search, setSearch] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['listings', filter, search],
    queryFn: () => api.listings({ status: filter || undefined, search: search || undefined, per_page: 20 }),
  })

  const { mutate } = useMutation({
    mutationFn: ({ id, status }) => api.moderateListing(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['listings'] }),
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Listing moderation</h1>
        <p className="text-sm text-[#5C5C5C]">User & listing moderation per spec §6 — archived listings hide from AniMarket feed but remain for audit.</p>
      </div>

      <div className="bg-white rounded-[12px] border border-[#E8E2D6] p-4 flex flex-wrap gap-3">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search listing or farmer (e.g. Pechay, Lito)" className="h-10 rounded-full border border-[#E8E2D6] px-4 text-sm min-w-[260px] focus:outline-none focus:border-[#2E5339]" />
        {['available','sold_out','archived'].map(s => (
          <button key={s} onClick={()=>setFilter(s)} className={`h-9 px-4 rounded-full border text-sm capitalize ${filter===s ? 'bg-[#2E5339] text-white border-[#2E5339]' : 'bg-white border-[#E8E2D6]'}`}>{s.replace('_',' ')}</button>
        ))}
        <button onClick={()=>setFilter('')} className={`h-9 px-3 rounded-full border text-sm ${!filter ? 'bg-[#2E5339] text-white border-[#2E5339]' : 'bg-white border-[#E8E2D6]'}`}>All</button>
      </div>

      {isLoading ? <div className="p-6">Loading listings…</div> : (
        <div className="bg-white rounded-[12px] border border-[#E8E2D6] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAF8F3] text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">
                <tr><th className="text-left px-4 py-3">Listing</th><th className="text-left px-4 py-3">Farmer</th><th className="text-left px-4 py-3">Price</th><th className="text-left px-4 py-3">Stock</th><th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-[#F0EDE6]">
                {(data?.data || []).map(p => (
                  <tr key={p.id} className="hover:bg-[#FAF8F3]/60">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-[#8A8A8A]">{p.category?.name} · Harvest {p.harvest_date || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.farmer?.name}</div>
                      <div className="text-xs text-[#8A8A8A] flex items-center gap-1">{p.farmer?.email} {p.farmer?.verified && <span className="px-1.5 py-0.5 rounded-full bg-[#E8F0E9] text-[#2E5339] text-[10px]">Verified</span>}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#2E5339]">₱{Number(p.price_per_unit).toLocaleString('en-PH')} / {p.unit_type}</td>
                    <td className="px-4 py-3">{p.available_quantity} {p.unit_type}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold border ${p.status==='available'?'bg-[#E8F0E9] border-[#C5D9C7] text-[#2E5339]': p.status==='archived'?'bg-[#FDEDEC] border-[#E8C6C6] text-[#B0413E]':'bg-[#FFF4D6] border-[#F2D98A] text-[#8A6A0A]'}`}>{p.status}</span></td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {p.status !== 'archived' && <button onClick={()=>mutate({ id: p.id, status: 'archived' })} className="h-8 px-3 rounded-full border border-[#E8C6C6] text-[#B0413E] text-xs font-semibold hover:bg-[#FDEDEC]">Archive</button>}
                      {p.status === 'archived' && <button onClick={()=>mutate({ id: p.id, status: 'available' })} className="h-8 px-3 rounded-full bg-[#2E5339] text-white text-xs font-semibold">Restore</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
