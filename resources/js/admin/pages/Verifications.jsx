import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useState } from 'react'
import { PageHeader, CardSkeleton, EmptyState, Chip, Icon } from '../../shared/ui'

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

  const list = data?.data || []

  return (
    <div className="space-y-4">
      <PageHeader
        title="Farmer verification"
        desc="Review farm documents and grant the verified badge — farmers are notified the moment you decide."
      >
        <div className="flex gap-2">
          {['pending', 'approved', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`h-9 px-4 rounded-full border text-sm font-medium capitalize transition ${filter === s ? 'bg-[#2E5339] text-white border-[#2E5339]' : 'bg-white border-[#E8E2D6] hover:bg-[#FAF8F3]'}`}>
              {s}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="bg-white rounded-[12px] border border-[#E8E2D6] p-4 flex gap-3 items-center">
        <Icon name="badge" className="w-4 h-4 text-[#8A8A8A] shrink-0" />
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note for the farmer — shown when you reject a request" className="flex-1 h-10 rounded-full border border-[#E8E2D6] px-4 text-sm focus:outline-none focus:border-[#2E5339] focus:ring-2 focus:ring-[#E8F0E9]" />
        <span className="text-xs text-[#8A8A8A] hidden md:inline shrink-0">Applies to your next decision</span>
      </div>

      {isLoading && <CardSkeleton rows={3} />}
      {error && <div className="p-6 text-[#B0413E]">{error.message}</div>}

      <div className="grid gap-4">
        {list.map(p => (
          <div key={p.id} className="bg-white rounded-[12px] border border-[#E8E2D6] p-5 flex gap-4 sm:gap-5 shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
            <div className="w-12 h-12 rounded-xl bg-[#E8F0E9] flex items-center justify-center font-bold text-[#2E5339] shrink-0">
              {p.user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{p.user?.name}</span>
                <span className="text-sm text-[#8A8A8A]">· {p.user?.email}</span>
                <Chip tone={p.verification_status}>{p.verification_status}</Chip>
              </div>
              <div className="text-sm font-medium text-[#2E5339]">{p.farm_name} · {p.barangay}, {p.municipality}, {p.province}</div>
              <div className="text-xs text-[#8A8A8A] mt-0.5">
                {p.bio || 'No bio yet'} · {p.verification_doc_path ? `Document uploaded: ${p.verification_doc_path}` : 'No document uploaded yet'}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.verification_status !== 'approved' && (
                  <button disabled={isPending} onClick={() => mutate({ id: p.id, status: 'approved' })}
                    className="h-9 px-4 rounded-full bg-[#2E5339] text-white text-sm font-semibold hover:bg-[#24412D] disabled:opacity-60 inline-flex items-center gap-2 transition">
                    <Icon name="badge" className="w-4 h-4" /> Approve — grant verified badge
                  </button>
                )}
                {p.verification_status !== 'rejected' && (
                  <button disabled={isPending} onClick={() => mutate({ id: p.id, status: 'rejected' })}
                    className="h-9 px-4 rounded-full bg-white border border-[#E8C6C6] text-[#B0413E] text-sm font-semibold hover:bg-[#FDEDEC] disabled:opacity-60 transition">
                    Reject
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!isLoading && list.length === 0 && (
          <EmptyState
            icon="badge"
            title={`No ${filter} verifications`}
            hint="New farmer sign-ups will appear here for review."
          />
        )}
      </div>
    </div>
  )
}
