import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useState } from 'react'
import { PageHeader, CardSkeleton, EmptyState, Chip, Icon } from '../../shared/ui'

// Spec module 6: dispute/report handling — resolve or dismiss with a note;
// the reporter is notified of the outcome either way.
export default function Reports() {
  const [filter, setFilter] = useState('open')
  const [notes, setNotes] = useState({})
  const qc = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', filter],
    queryFn: () => api.reports({ status: filter === 'all' ? undefined : filter, per_page: 20 }),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: ({ id, status, note }) => api.handleReport(id, status, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  })

  const list = data?.data || []

  return (
    <div className="space-y-4">
      <PageHeader
        title="Disputes & reports"
        desc="Everything buyers and farmers flag — order problems, misconduct, payment issues. Resolve or dismiss with a note; the reporter is notified."
      >
        <div className="flex gap-2">
          {['open', 'resolved', 'dismissed', 'all'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`h-9 px-4 rounded-full border text-sm font-medium capitalize transition ${filter === s ? 'bg-[#2E5339] text-white border-[#2E5339]' : 'bg-white border-[#E8E2D6] hover:bg-[#FAF8F3]'}`}>
              {s}
            </button>
          ))}
        </div>
      </PageHeader>

      {isLoading && <CardSkeleton rows={3} />}
      {error && <div className="p-6 text-[#B0413E]">{error.message}</div>}

      <div className="grid gap-4">
        {list.map(r => (
          <div key={r.id} className="bg-white rounded-[12px] border border-[#E8E2D6] p-5 shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold capitalize">{(r.category || '').replace('_', ' ') || '—'}</span>
              <Chip tone={r.status === 'open' ? 'pending' : r.status === 'resolved' ? 'approved' : 'cancelled'}>{r.status}</Chip>
              {r.order && <span className="text-xs text-[#8A8A8A]">Order #{r.order.id}</span>}
              {r.reported_user && <span className="text-xs text-[#8A8A8A]">Against {r.reported_user.name} ({r.reported_user.role})</span>}
            </div>
            <p className="text-sm text-[#5C5C5C] mt-2 leading-6">{r.description}</p>
            <div className="text-xs text-[#8A8A8A] mt-1">Filed by {r.reporter?.name} · {new Date(r.created_at).toLocaleDateString('en-PH')}</div>
            {r.status === 'open' ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={notes[r.id] ?? ''}
                  onChange={e => setNotes(s => ({ ...s, [r.id]: e.target.value }))}
                  placeholder="Resolution note (sent to the reporter)"
                  className="flex-1 min-w-[220px] h-10 rounded-full border border-[#E8E2D6] px-4 text-sm focus:outline-none focus:border-[#2E5339] focus:ring-2 focus:ring-[#E8F0E9]"
                />
                <button disabled={isPending}
                  onClick={() => mutate({ id: r.id, status: 'resolved', note: notes[r.id] })}
                  className="h-9 px-4 rounded-full bg-[#2E5339] text-white text-sm font-semibold hover:bg-[#24412D] disabled:opacity-60">
                  Resolve
                </button>
                <button disabled={isPending}
                  onClick={() => mutate({ id: r.id, status: 'dismissed', note: notes[r.id] })}
                  className="h-9 px-4 rounded-full bg-white border border-[#E8C6C6] text-[#B0413E] text-sm font-semibold hover:bg-[#FDEDEC] disabled:opacity-60">
                  Dismiss
                </button>
              </div>
            ) : (
              <div className="mt-2 text-sm text-[#4A7C59]">
                {r.status === 'resolved' ? 'Resolved' : 'Dismissed'}{r.resolution_note ? ` — ${r.resolution_note}` : ''}
              </div>
            )}
          </div>
        ))}
        {!isLoading && list.length === 0 && (
          <EmptyState icon="alert" title={`No ${filter} reports`} hint="Reports filed from the mobile app or web shop will appear here." />
        )}
      </div>
    </div>
  )
}
