import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useState } from 'react'

const statusTone = {
  pending: 'bg-[#FFF4D6] border-[#F2D98A] text-[#8A6A0A]',
  approved: 'bg-[#E8F0E9] border-[#C5D9C7] text-[#2E5339]',
  rejected: 'bg-[#FDEDEC] border-[#E8C6C6] text-[#B0413E]',
}

export default function Verifications() {
  const [filter, setFilter] = useState('pending')
  const qc = useQueryClient()
  const [note, setNote] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['verifications', filter],
    queryFn: () => api.verifications({ status: filter, per_page: 20 }),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: ({ id, status }) => api.decide(id, status, note),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['verifications'] }); setNote('') },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Farmer verification</h1>
          <p className="text-sm text-[#5C5C5C]">Document upload + admin approval per spec §1 — pending/approved/rejected, notify farmer via <code>notifications</code>.</p>
        </div>
        <div className="flex gap-2">
          {['pending','approved','rejected'].map(s => (
            <button key={s} onClick={()=>setFilter(s)} className={`h-9 px-4 rounded-full border text-sm font-medium capitalize ${filter===s ? 'bg-[#2E5339] text-white border-[#2E5339]' : 'bg-white border-[#E8E2D6] hover:bg-[#FAF8F3]'}`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[12px] border border-[#E8E2D6] p-4 flex gap-3">
        <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional note for rejection (shows in farmer notification)" className="flex-1 h-10 rounded-full border border-[#E8E2D6] px-4 text-sm focus:outline-none focus:border-[#2E5339]" />
        <span className="text-xs text-[#8A8A8A] self-center">Applies to next decision</span>
      </div>

      {isLoading && <div className="p-6">Loading verifications…</div>}
      {error && <div className="p-6 text-[#B0413E]">{error.message}</div>}

      <div className="grid gap-4">
        {(data?.data || []).map(p => (
          <div key={p.id} className="bg-white rounded-[12px] border border-[#E8E2D6] p-5 flex gap-5">
            <div className="w-12 h-12 rounded-xl bg-[#E8F0E9] flex items-center justify-center font-bold text-[#2E5339]">{p.user?.name?.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{p.user?.name}</span>
                <span className="text-sm text-[#8A8A8A]">· {p.user?.email}</span>
                <span className={`text-xs px-2 py-1 rounded-full border font-semibold capitalize ${statusTone[p.verification_status]}`}>{p.verification_status}</span>
              </div>
              <div className="text-sm font-medium text-[#2E5339]">{p.farm_name} · {p.barangay}, {p.municipality}, {p.province}</div>
              <div className="text-xs text-[#8A8A8A]">{p.bio || 'No bio'} {p.verification_doc_path ? `· Doc: ${p.verification_doc_path}` : '· No doc uploaded'}</div>
              <div className="mt-3 flex gap-2">
                {p.verification_status !== 'approved' && (
                  <button disabled={isPending} onClick={()=>mutate({ id: p.id, status: 'approved' })} className="h-9 px-4 rounded-full bg-[#2E5339] text-white text-sm font-semibold hover:bg-[#24412D] disabled:opacity-60">Approve → Verified badge</button>
                )}
                {p.verification_status !== 'rejected' && (
                  <button disabled={isPending} onClick={()=>mutate({ id: p.id, status: 'rejected' })} className="h-9 px-4 rounded-full bg-white border border-[#E8C6C6] text-[#B0413E] text-sm font-semibold hover:bg-[#FDEDEC] disabled:opacity-60">Reject</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {data?.data?.length === 0 && <div className="bg-white rounded-[12px] border border-[#E8E2D6] p-10 text-center text-[#8A8A8A]">No {filter} verifications. Seeded: 2 pending (jun.pending, elena.pending) + 1 rejected.</div>}
      </div>
    </div>
  )
}
