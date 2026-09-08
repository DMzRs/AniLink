import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useState } from 'react'

export default function Users() {
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['users', filter, search], queryFn: () => api.users({ role: filter || undefined, search: search || undefined, per_page: 20 }) })

  const { mutate } = useMutation({ mutationFn: ({ id, payload }) => api.moderateUser(id, payload), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">User moderation</h1>
          <p className="text-sm text-[#5C5C5C]">Farmer / Buyer-Individual / Buyer-Business / Admin per spec §1 — verify, moderate, dispute handling.</p>
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-[#E8E2D6] p-4 flex flex-wrap gap-3">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or email" className="h-10 rounded-full border border-[#E8E2D6] px-4 text-sm min-w-[260px]" />
        {['', 'farmer','buyer_individual','buyer_business','admin'].map(r => (
          <button key={r} onClick={()=>setFilter(r)} className={`h-9 px-3 rounded-full border text-sm capitalize ${filter===r ? 'bg-[#2E5339] text-white border-[#2E5339]' : 'bg-white border-[#E8E2D6]'}`}>{r || 'All'}</button>
        ))}
      </div>

      {isLoading ? <div className="p-6">Loading users…</div> : (
        <div className="bg-white rounded-[12px] border border-[#E8E2D6] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FAF8F3] text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">
              <tr><th className="text-left px-4 py-3">User</th><th className="text-left px-4 py-3">Role</th><th className="text-left px-4 py-3">Location / Farm</th><th className="text-left px-4 py-3">Verified</th><th className="text-right px-4 py-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-[#F0EDE6]">
              {(data?.data || []).map(u => (
                <tr key={u.id}>
                  <td className="px-4 py-3"><div className="font-medium">{u.name}</div><div className="text-xs text-[#8A8A8A]">{u.email} · {u.phone || 'no phone'}</div></td>
                  <td className="px-4 py-3"><span className="px-2 py-1 rounded-full bg-[#E8F0E9] border border-[#C5D9C7] text-xs font-semibold text-[#2E5339]">{u.role}</span></td>
                  <td className="px-4 py-3 text-xs text-[#5C5C5C]">{u.farmerProfile ? `${u.farmerProfile.farm_name} · ${u.farmerProfile.barangay}, ${u.farmerProfile.municipality}` : u.buyerProfile ? (u.buyerProfile.buyer_type || '—') : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs border ${u.is_verified ? 'bg-[#E8F0E9] border-[#C5D9C7] text-[#2E5339]' : 'bg-[#FFF4D6] border-[#F2D98A] text-[#8A6A0A]'}`}>{u.is_verified ? 'Verified' : 'Unverified'}</span>
                    {u.farmerProfile && <div className="text-[11px] text-[#8A8A8A] mt-1">Verification: {u.farmerProfile.verification_status}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={()=>mutate({ id: u.id, payload: { is_verified: !u.is_verified } })} className="h-8 px-3 rounded-full border border-[#E8E2D6] text-xs font-semibold hover:bg-[#FAF8F3]">{u.is_verified ? 'Unverify' : 'Verify'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
