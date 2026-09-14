import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { peso, statusColor } from '../components/format'

const filters = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled']

// Business buyers: one-round bulk quote negotiation (request from a product page)
function QuotePanel() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const { data } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => api.quotes(),
    enabled: user?.role === 'buyer_business',
  })

  if (user?.role !== 'buyer_business') return null
  const quotes = data?.quotes ?? []
  if (quotes.length === 0) return null

  const act = async (fn) => {
    setBusy(true)
    try {
      await fn()
      qc.invalidateQueries({ queryKey: ['quotes'] })
    } catch (err) {
      alert(err.message || 'Quote action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-[#FFF4D6] border border-[#F2D98A] rounded-[16px] p-5">
      <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A6A0A] mb-3">Bulk quotes (B2B)</div>
      <div className="space-y-3">
        {quotes.map(q => (
          <div key={q.id} className="bg-white border border-[#F2D98A] rounded-[12px] p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-semibold text-sm">{q.quantity} {q.product?.unit_type} · {q.product?.name}</span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize bg-[#F0EDE6] text-[#5C5C5C]">{q.status}</span>
            </div>
            <div className="text-xs text-[#8A8A8A] mt-0.5">From {q.farmer?.farm_name || q.farmer?.name || '—'}</div>
            {q.status === 'quoted' && (
              <div className="text-sm mt-1">
                <span className="font-semibold text-[#2E5339]">Quoted {peso(q.quoted_unit_price)}/{q.product?.unit_type}</span>
                <span className="text-[#8A8A8A]"> — order total ≈ {peso(q.quoted_unit_price * q.quantity)}{q.response_note ? ` · ${q.response_note}` : ''}</span>
              </div>
            )}
            {q.message && q.status === 'pending' && <div className="text-sm text-[#5C5C5C] mt-1">“{q.message}”</div>}
            <div className="flex flex-wrap gap-2 mt-3">
              {q.status === 'quoted' && (
                <>
                  <button disabled={busy} onClick={() => act(() => api.acceptQuote(q.id, 'pickup'))}
                    className="text-xs font-semibold px-3 py-2 rounded-[10px] bg-[#2E5339] text-white hover:brightness-110 disabled:opacity-50">
                    Accept — pickup
                  </button>
                  <button disabled={busy} onClick={() => act(() => api.acceptQuote(q.id, 'delivery'))}
                    className="text-xs font-semibold px-3 py-2 rounded-[10px] border border-[#C5D9C7] text-[#2E5339] hover:bg-[#FAF8F3] disabled:opacity-50">
                    Accept — delivery (+{peso(45)})
                  </button>
                </>
              )}
              {(q.status === 'pending' || q.status === 'quoted') && (
                <button disabled={busy} onClick={() => act(() => api.withdrawQuote(q.id))}
                  className="text-xs font-semibold px-3 py-2 rounded-[10px] border border-[#E5B9B6] text-[#B0413E] hover:bg-[#F6E3E2] disabled:opacity-50">
                  Withdraw
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Orders() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState('all')
  const [cancellingId, setCancellingId] = useState(null)
  const [ratingOpenId, setRatingOpenId] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [ratedIds, setRatedIds] = useState([])
  const [reportingId, setReportingId] = useState(null)
  const [reportForm, setReportForm] = useState({ category: 'order_issue', description: '' })
  const [reportedIds, setReportedIds] = useState([])
  const [busy, setBusy] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['orders', status],
    queryFn: () => api.orders(status === 'all' ? {} : { status }),
    refetchInterval: 15000,
  })

  const orders = data?.data ?? []
  const justPlaced = params.get('placed')

  const cancel = async (id) => {
    setCancellingId(id)
    try {
      await api.updateOrderStatus(id, 'cancelled')
      qc.invalidateQueries({ queryKey: ['orders'] })
    } catch (err) {
      alert(err.message || 'Could not cancel order')
    } finally {
      setCancellingId(null)
    }
  }

  const submitReport = async (id) => {
    setBusy(true)
    try {
      await api.fileReport({ order_id: id, category: reportForm.category, description: reportForm.description })
      setReportedIds(ids => [...ids, id])
      setReportingId(null)
      setReportForm({ category: 'order_issue', description: '' })
    } catch (err) {
      alert(err.message || 'Could not file report')
    } finally {
      setBusy(false)
    }
  }

  const submitReview = async (id) => {
    setBusy(true)
    try {
      await api.reviewOrder(id, { rating, comment: comment || null })
      setRatedIds(ids => [...ids, id])
      setRatingOpenId(null)
      setComment('')
      qc.invalidateQueries({ queryKey: ['orders'] })
    } catch (err) {
      alert(err.message || 'Could not submit review')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">My orders</h1>

      {justPlaced && (
        <div className="bg-[#E8F0E9] border border-[#C5D9C7] text-[#2E5339] text-sm rounded-[12px] px-4 py-3">
          🎉 Order placed! The farmer will confirm shortly — you'll get a notification at every step.
        </div>
      )}

      <QuotePanel />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map(f => (
          <button key={f} onClick={() => setStatus(f)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm border capitalize transition ${status === f ? 'bg-[#2E5339] border-[#2E5339] text-white font-semibold' : 'bg-white border-[#E8E2D6] text-[#5C5C5C] hover:border-[#C5D9C7]'}`}>
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-white border border-[#E8E2D6] rounded-[16px] animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-[#8A8A8A]">
          <div className="text-4xl mb-3">📦</div>
          No orders in this view yet.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="bg-white border border-[#E8E2D6] rounded-[16px] p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold">Order #{o.id} <span className="text-xs font-normal text-[#8A8A8A]">· {new Date(o.created_at).toLocaleDateString('en-PH')}</span></div>
                  <div className="text-xs text-[#5C5C5C] mt-0.5">
                    From {o.farmer?.farm_name || o.farmer?.name || '—'} · {o.fulfillment_type === 'delivery' ? `Delivery → ${o.delivery_address}` : 'Farm pickup'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${statusColor(o.status)}`}>{o.status}</span>
                  <span className="text-[11px] px-2 py-1 rounded-full bg-[#F0EDE6] text-[#5C5C5C] capitalize">{o.order_type}</span>
                </div>
              </div>

              <div className="mt-3 space-y-1 border-t border-[#F0EDE6] pt-3">
                {o.items.map(i => (
                  <div key={i.id} className="flex justify-between text-sm text-[#5C5C5C]">
                    <span>{i.product_name} × {i.quantity} {i.unit_type}</span>
                    <span>{peso(i.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F0EDE6]">
                <div className="text-lg font-bold text-[#2E5339]">{peso(o.total_amount)}</div>
                <div className="flex items-center gap-2">
                  {o.status === 'completed' && !ratedIds.includes(o.id) && (
                    <button
                      onClick={() => setRatingOpenId(ratingOpenId === o.id ? null : o.id)}
                      className="text-xs font-semibold px-3 py-2 rounded-[10px] bg-[#FFF4D6] border border-[#F2D98A] text-[#8A6A0A] hover:brightness-105"
                    >
                      {ratingOpenId === o.id ? 'Close' : '★ Rate farmer'}
                    </button>
                  )}
                  {o.status === 'completed' && ratedIds.includes(o.id) && (
                    <span className="text-xs text-[#4A7C59] font-semibold">✓ Review submitted</span>
                  )}
                  {!reportedIds.includes(o.id) && (
                    <button
                      onClick={() => setReportingId(reportingId === o.id ? null : o.id)}
                      className="text-xs font-semibold px-3 py-2 rounded-[10px] border border-[#E8E2D6] text-[#5C5C5C] hover:bg-[#FAF8F3]"
                    >
                      {reportingId === o.id ? 'Close' : 'Report problem'}
                    </button>
                  )}
                  {o.status === 'pending' && (
                    <button
                      onClick={() => cancel(o.id)}
                      disabled={cancellingId === o.id}
                      className="text-xs font-semibold px-3 py-2 rounded-[10px] border border-[#E5B9B6] text-[#B0413E] hover:bg-[#F6E3E2] disabled:opacity-50"
                    >
                      {cancellingId === o.id ? 'Cancelling…' : 'Cancel order'}
                    </button>
                  )}
                </div>
              </div>

              {reportingId === o.id && !reportedIds.includes(o.id) && (
                <form
                  onSubmit={(e) => { e.preventDefault(); submitReport(o.id) }}
                  className="mt-3 bg-[#FAF8F3] border border-[#E8E2D6] rounded-[12px] p-4 space-y-3"
                >
                  <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Report a problem with order #{o.id}</div>
                  <select
                    value={reportForm.category}
                    onChange={(e) => setReportForm({ ...reportForm, category: e.target.value })}
                    className="w-full border border-[#E8E2D6] bg-white rounded-[12px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#2E5339]"
                  >
                    <option value="order_issue">Order issue (delivery, quality…)</option>
                    <option value="payment">Payment problem</option>
                    <option value="product_issue">Product not as listed</option>
                    <option value="user_misconduct">Farmer conduct</option>
                    <option value="other">Something else</option>
                  </select>
                  <textarea
                    rows={3}
                    required
                    minLength={10}
                    placeholder="Tell us what happened (min 10 characters)"
                    value={reportForm.description}
                    onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                    className="w-full border border-[#E8E2D6] bg-white rounded-[12px] px-3 py-2 text-sm focus:outline-none focus:border-[#2E5339]"
                  />
                  <button disabled={busy}
                    className="w-full py-2.5 rounded-[12px] bg-[#B0413E] text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50">
                    {busy ? 'Sending…' : 'Send report to AniLink team'}
                  </button>
                </form>
              )}
              {reportedIds.includes(o.id) && (
                <div className="mt-3 text-xs text-[#4A7C59]">✓ Report sent — we'll update you on the outcome.</div>
              )}

              {ratingOpenId === o.id && (
                <form
                  onSubmit={(e) => { e.preventDefault(); submitReview(o.id) }}
                  className="mt-3 bg-[#FAF8F3] border border-[#F0EDE6] rounded-[12px] p-4 space-y-3"
                >
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button" onClick={() => setRating(n)}
                        className={`text-2xl transition ${n <= rating ? 'text-[#D4A017]' : 'text-[#E8E2D6]'}`}
                        aria-label={`${n} star${n > 1 ? 's' : ''}`}>★</button>
                    ))}
                    <span className="text-xs text-[#8A8A8A] ml-2">{['Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating - 1]}</span>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="How was the produce and the farmer? (optional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full border border-[#E8E2D6] bg-white rounded-[12px] px-3 py-2 text-sm focus:outline-none focus:border-[#2E5339]"
                  />
                  <button
                    disabled={busy}
                    className="w-full py-2.5 rounded-[12px] bg-[#2E5339] text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50"
                  >
                    {busy ? 'Submitting…' : 'Submit review'}
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
