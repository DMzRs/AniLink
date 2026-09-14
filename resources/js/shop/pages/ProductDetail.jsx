import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useCart } from '../lib/cart'
import { peso } from '../components/format'

export default function ProductDetail() {
  const { id } = useParams()
  const navgo = useNavigate()
  const { add } = useCart()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.product(id),
  })
  const p = data?.data

  if (isLoading) return <div className="max-w-3xl mx-auto aspect-[16/9] bg-white border border-[#E8E2D6] rounded-[16px] animate-pulse" />
  if (isError || !p) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">🧺</div>
        <p className="text-[#5C5C5C]">This listing is no longer available.</p>
        <Link to="/" className="text-sm text-[#2E5339] font-semibold underline mt-2 inline-block">Back to market</Link>
      </div>
    )
  }

  const addToCart = () => {
    add(p, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navgo(-1)} className="text-sm text-[#5C5C5C] hover:text-[#2E5339] mb-4">← Back</button>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="aspect-[4/3] bg-[#F0EDE6] rounded-[16px] overflow-hidden border border-[#E8E2D6]">
          {p.image
            ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-6xl">🌾</div>}
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold">{p.name}</h1>
              {p.farmer?.verified && (
                <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-[#E8F0E9] border border-[#C5D9C7] text-[#2E5339]">✓ Verified farm</span>
              )}
            </div>
            {p.category && <div className="text-sm text-[#8A8A8A] mt-1">{p.category.name}</div>}
          </div>

          <div className="text-3xl font-bold text-[#2E5339]">
            {peso(p.price_per_unit)}<span className="text-sm font-normal text-[#8A8A8A]">/{p.unit_type}</span>
          </div>

          {p.min_bulk_quantity && p.bulk_price && (
            <div className="text-sm bg-[#FFF4D6] border border-[#F2D98A] text-[#8A6A0A] rounded-[12px] px-3 py-2">
              🧺 Bulk deal: {peso(p.bulk_price)}/{p.unit_type} for {p.min_bulk_quantity}+ {p.unit_type}
            </div>
          )}

          <p className="text-sm text-[#5C5C5C] leading-6">{p.description || 'No description provided.'}</p>

          {p.harvest_date && (
            <div className="text-xs text-[#8A8A8A]">🌾 Harvested {p.harvest_date}</div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex items-center border border-[#E8E2D6] bg-white rounded-[12px] overflow-hidden">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 text-lg hover:bg-[#FAF8F3]">−</button>
              <input
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1))}
                className="w-14 text-center text-sm py-2 focus:outline-none"
              />
              <button onClick={() => setQty(qty + 1)} className="w-10 h-10 text-lg hover:bg-[#FAF8F3]">+</button>
            </div>
            <span className="text-xs text-[#8A8A8A]">{p.available_quantity} {p.unit_type} available</span>
          </div>

          <div className="flex gap-2">
            <button
              disabled={p.status !== 'available' || p.available_quantity <= 0}
              onClick={addToCart}
              className="flex-1 py-3 rounded-[12px] bg-[#D4A017] text-[#1A1A1A] text-sm font-semibold hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {added ? '✓ Added to cart' : 'Add to cart'}
            </button>
            <button
              onClick={() => { addToCart(); navgo('/cart') }}
              disabled={p.status !== 'available' || p.available_quantity <= 0}
              className="flex-1 py-3 rounded-[12px] bg-[#2E5339] text-white text-sm font-semibold hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Buy now
            </button>
          </div>
        </div>
      </div>

      {p.farmer && (
        <>
          <div className="mt-8 bg-white border border-[#E8E2D6] rounded-[16px] p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#E8F0E9] flex items-center justify-center text-xl">🧑‍🌾</div>
            <div className="flex-1">
              <div className="font-semibold">{p.farmer.farm_name || p.farmer.name}</div>
              <div className="text-xs text-[#5C5C5C]">{[p.farmer.barangay, p.farmer.municipality, p.farmer.province].filter(Boolean).join(', ') || 'Philippines'}</div>
            </div>
            {p.farmer.rating_avg ? (
              <div className="text-right shrink-0">
                <div className="text-[#D4A017] font-bold">★ {p.farmer.rating_avg.toFixed(1)}</div>
                <div className="text-xs text-[#8A8A8A]">{p.farmer.rating_count} review{p.farmer.rating_count === 1 ? '' : 's'}</div>
              </div>
            ) : (
              <div className="text-xs text-[#8A8A8A] shrink-0">No reviews yet</div>
            )}
          </div>

          {p.farmer.rating_count > 0 && <FarmerReviews farmerId={p.farmer.id} />}
        </>
      )}
    </div>
  )
}

function FarmerReviews({ farmerId }) {
  const { data } = useQuery({
    queryKey: ['farmer-reviews', farmerId],
    queryFn: () => api.farmerReviews(farmerId),
  })
  const reviews = data?.reviews ?? []
  if (reviews.length === 0) return null

  return (
    <div className="mt-4 bg-white border border-[#E8E2D6] rounded-[16px] p-5">
      <h2 className="font-semibold mb-3">Buyer reviews</h2>
      <div className="space-y-3">
        {reviews.map(r => (
          <div key={r.id} className="border-t border-[#F0EDE6] first:border-0 first:pt-0 pt-3">
            <div className="flex items-center gap-2">
              <span className="text-[#D4A017] font-semibold text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              <span className="text-xs text-[#5C5C5C] font-medium">{r.reviewer_name || 'Buyer'}</span>
              <span className="text-xs text-[#8A8A8A]">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-PH') : ''}</span>
            </div>
            {r.comment && <p className="text-sm text-[#5C5C5C] mt-1 leading-6">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
