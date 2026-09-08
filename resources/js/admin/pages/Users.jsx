import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useState } from 'react'
import { PageHeader, CardSkeleton, EmptyState, Chip, Icon } from '../../shared/ui'

const ROLE_LABEL = { farmer: 'Farmer', buyer_individual: 'Buyer · Individual', buyer_business: 'Buyer · Business', admin: 'Admin' }

export default function Users() {
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['users', filter, search], queryFn: () => api.users({ role: filter || undefined, search: search || undefined, per_page: 20 }) })

  const { mutate } = useMutation({ mutationFn: ({ id, payload }) => api.moderateUser(id, payload), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) })

  const rows = data?.data || []

  return (
    <div className="space-y-4">
      <PageHeader
        title="User moderation"
        desc="Everyone on AniLink — farmers, households, and business buyers — with verification at a glance."
      />

      <div className="bg-white rounded-[12px] border border-[#E8E2D6] p-4 flex flex-wrap gap-3 items-center">
        <label className="relative min-w-[260px] flex-1">
          <Icon name="search" className="w-4 h-4 text-[#8A8A8A] absolute left-4 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email"
            className="w-full h-10 rounded-full border border-[#E8E2D6] pl-10 pr-4 text-sm focus:outline-none focus:border-[#2E5339] focus:ring-2 focus:ring-[#E8F0E9]" />
        </label>
        {['', 'farmer', 'buyer_individual', 'buyer_business', 'admin'].map(r => (
          <button key={r || 'all'} onClick={() => setFilter(r)}
            className={`h-9 px-3 rounded-full border text-sm transition ${filter === r ? 'bg-[#2E5339] text-white border-[#2E5339] font-medium' : 'bg-white border-[#E8E2D6] hover:bg-[#FAF8F3]'}`}>
            {r ? ROLE_LABEL[r] : 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <CardSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState icon="users" title="No users found" hint="Try a different search or role filter." />
      ) : (
        <div className="bg-white rounded-[12px] border border-[#E8E2D6] overflow-hidden shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FAF8F3] text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">
                <tr>
                  <th className="text-left px-4 py-3">User</th><th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Location / Farm</th><th className="text-left px-4 py-3">Verified</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EDE6]">
                {rows.map(u => (
                  <tr key={u.id} className="hover:bg-[#FAF8F3]/60 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-[#E8F0E9] text-[#2E5339] grid place-items-center text-xs font-bold shrink-0">
                          {u.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                        {u.name}
                      </div>
                      <div className="text-xs text-[#8A8A8A] mt-0.5">{u.email} · {u.phone || 'no phone'}</div>
                    </td>
                    <td className="px-4 py-3"><Chip tone={u.role === 'farmer' ? 'available' : 'pending'}>{ROLE_LABEL[u.role] || u.role}</Chip></td>
                    <td className="px-4 py-3 text-xs text-[#5C5C5C]">
                      {u.farmerProfile ? `${u.farmerProfile.farm_name} · ${u.farmerProfile.barangay}, ${u.farmerProfile.municipality}` : u.buyerProfile ? (u.buyerProfile.buyer_type || '—') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Chip tone={u.is_verified ? 'verified' : 'unverified'}>{u.is_verified ? 'Verified' : 'Unverified'}</Chip>
                      {u.farmerProfile && <div className="text-[11px] text-[#8A8A8A] mt-1">Verification: {u.farmerProfile.verification_status}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => mutate({ id: u.id, payload: { is_verified: !u.is_verified } })}
                        className="h-8 px-3 rounded-full border border-[#E8E2D6] text-xs font-semibold hover:bg-[#FAF8F3] transition">
                        {u.is_verified ? 'Unverify' : 'Verify'}
                      </button>
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
