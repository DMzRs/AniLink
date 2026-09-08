import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useState } from 'react'
import { PageHeader, CardSkeleton, EmptyState, Chip, Icon } from '../../shared/ui'

const fmtPeso = (n) => Number(n).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })

function StockStepper({ value, unit, onDelta, loading }) {
  return (
    <div className="flex items-center rounded-full border border-[#E8E2D6] bg-white overflow-hidden h-11">
      <button disabled={loading} onClick={() => onDelta(-1)} aria-label="Remove one" className="w-11 h-full bg-[#FAF8F3] hover:bg-[#E8E2D6] disabled:opacity-40 text-lg font-semibold transition">−</button>
      <div className="flex-1 text-center leading-none">
        <div className={`font-semibold ${Number(value) <= 5 ? 'text-[#B0413E]' : 'text-[#1A1A1A]'}`}>{value}</div>
        <div className="text-[11px] text-[#8A8A8A] -mt-1">{unit}</div>
      </div>
      <button disabled={loading} onClick={() => onDelta(1)} aria-label="Add one" className="w-11 h-full bg-[#2E5339] hover:bg-[#24412D] disabled:opacity-40 text-white text-lg font-semibold transition">+</button>
    </div>
  )
}

export default function Inventory() {
  const qc = useQueryClient()
  const [updating, setUpdating] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', category_id: '', unit_type: 'kg', price_per_unit: '', available_quantity: '', harvest_date: '', description: '', min_bulk_quantity: '', bulk_price: '' })
  const [imageFiles, setImageFiles] = useState([])
  const [formError, setFormError] = useState(null)

  const { data: prodRes, isLoading, error } = useQuery({ queryKey: ['farmer-products'], queryFn: () => api.farmerProducts() })
  const { data: ordersRes } = useQuery({ queryKey: ['farmer-orders'], queryFn: () => api.orders() })
  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: () => api.categories() })
  const categories = Array.isArray(cats) ? cats : (cats?.data ?? [])

  const products = prodRes?.data ?? prodRes ?? []
  const orders = Array.isArray(ordersRes?.data) ? ordersRes.data : (ordersRes ?? [])

  const lowStock = products.filter(p => Number(p.available_quantity) <= 5 && p.status !== 'archived')
  const todayStr = new Date().toDateString()
  const daily = orders.filter(o => new Date(o.created_at).toDateString() === todayStr && o.status !== 'cancelled').reduce((s,o)=>s+Number(o.total_amount||0),0)
  const weekly = orders.filter(o => new Date(o.created_at).getTime() > Date.now()-7*86400000 && o.status!=='cancelled').reduce((s,o)=>s+Number(o.total_amount||0),0)
  const pending = orders.filter(o=>o.status==='pending').length

  const adjust = useMutation({
    mutationFn: ({ id, delta }) => api.adjustStock(id, delta, delta>0 ? 'restock' : 'adjustment'),
    onMutate: async ({ id, delta }) => {
      setUpdating(id)
      await qc.cancelQueries({ queryKey: ['farmer-products'] })
      const prev = qc.getQueryData(['farmer-products'])
      qc.setQueryData(['farmer-products'], old => {
        const list = old?.data ?? old ?? []
        const next = list.map(p => p.id===id ? { ...p, available_quantity: Math.max(0, Number(p.available_quantity)+delta), status: Math.max(0, Number(p.available_quantity)+delta)===0 ? 'sold_out' : p.status } : p)
        return old?.data ? { ...old, data: next } : next
      })
      return { prev }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['farmer-products'], ctx.prev) },
    onSettled: () => { setUpdating(null); qc.invalidateQueries({ queryKey: ['farmer-products'] }) },
  })

  const toggleSoldOut = useMutation({
    mutationFn: ({ id, soldOut }) => soldOut ? api.updateProduct(id, { status: 'archived' }) : api.adjustStock(id, 10, 'restock'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['farmer-products'] }),
  })

  const create = useMutation({
    mutationFn: () => {
      const base = {
        name: form.name.trim(),
        category_id: Number(form.category_id),
        unit_type: form.unit_type,
        price_per_unit: Number(form.price_per_unit),
        available_quantity: Number(form.available_quantity),
        harvest_date: form.harvest_date || undefined,
        description: form.description || undefined,
        min_bulk_quantity: form.min_bulk_quantity ? Number(form.min_bulk_quantity) : undefined,
        bulk_price: form.bulk_price ? Number(form.bulk_price) : undefined,
      }
      if (!base.name || !base.category_id || !base.price_per_unit || !base.available_quantity) throw new Error('Name, category, price and stock are required.')
      if (imageFiles.length > 0) {
        const fd = new FormData()
        Object.entries(base).forEach(([k,v]) => { if (v !== undefined) fd.append(k, String(v)) })
        imageFiles.forEach(f => fd.append('images[]', f))
        return api.createProduct(fd)
      }
      return api.createProduct(base)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farmer-products'] })
      setForm({ name: '', category_id: '', unit_type: 'kg', price_per_unit: '', available_quantity: '', harvest_date: '', description: '', min_bulk_quantity: '', bulk_price: '' })
      setImageFiles([])
      setFormError(null)
      setShowAdd(false)
    },
    onError: (e) => setFormError(e.message),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Inventory" desc="One-tap stock updates — everything syncs with the AniLink mobile app." />
        <div className="grid md:grid-cols-3 gap-4">{[0,1,2].map(i => <CardSkeleton key={i} rows={1} />)}</div>
        <CardSkeleton rows={4} />
      </div>
    )
  }
  if (error) return <div className="p-6 text-[#B0413E]">Failed: {error.message}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Inventory" desc="One-tap stock updates — everything syncs with the AniLink mobile app." />
        <button onClick={() => setShowAdd(true)} className="shrink-0 inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#2E5339] text-white text-sm font-semibold hover:bg-[#24412D] shadow-[0_2px_8px_rgba(46,83,57,0.18)]">
          <span className="w-6 h-6 rounded-full bg-white/20 grid place-items-center text-sm">+</span> Add listing
        </button>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-[2px]" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-[560px] bg-white rounded-[16px] border border-[#E8E2D6] shadow-[0_16px_40px_rgba(26,26,0,0.16)] p-6 space-y-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">New harvest listing</h3>
              <button onClick={() => setShowAdd(false)} aria-label="Close" className="w-8 h-8 rounded-full bg-[#FAF8F3] border border-[#E8E2D6] grid place-items-center">×</button>
            </div>
            <p className="text-sm text-[#5C5C5C]">Farmer creates the listing — same <code className="px-1 py-0.5 rounded bg-[#E8F0E9] text-[#2E5339]">POST /api/products</code> as mobile. Verified badge shows after admin approval.</p>
            <div className="grid gap-3">
              <label className="grid gap-1"><span className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Product name *</span><input value={form.name} onChange={e=>setForm(s=>({...s, name: e.target.value}))} placeholder="e.g. Siling Labuyo" className="h-10 rounded-full border border-[#E8E2D6] px-4 placeholder:text-[#C2CAD5] focus:outline-none focus:border-[#2E5339] focus:ring-2 focus:ring-[#E8F0E9]" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1"><span className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Category *</span><select value={form.category_id} onChange={e=>setForm(s=>({...s, category_id: e.target.value}))} className="h-10 rounded-full border border-[#E8E2D6] px-3 bg-white focus:outline-none focus:border-[#2E5339]"><option value="">Select</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <label className="grid gap-1"><span className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Unit *</span><select value={form.unit_type} onChange={e=>setForm(s=>({...s, unit_type: e.target.value}))} className="h-10 rounded-full border border-[#E8E2D6] px-3 bg-white"><option value="kg">kg</option><option value="sack">sack</option><option value="piece">piece</option><option value="bundle">bundle</option><option value="bag">bag</option><option value="box">box</option></select></label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1"><span className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Price / unit *</span><input type="number" min="0" step="0.01" value={form.price_per_unit} onChange={e=>setForm(s=>({...s, price_per_unit: e.target.value}))} placeholder="120" className="h-10 rounded-full border border-[#E8E2D6] px-4 placeholder:text-[#C2CAD5]" /></label>
                <label className="grid gap-1"><span className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Stock *</span><input type="number" min="0" step="0.1" value={form.available_quantity} onChange={e=>setForm(s=>({...s, available_quantity: e.target.value}))} placeholder="18" className="h-10 rounded-full border border-[#E8E2D6] px-4 placeholder:text-[#C2CAD5]" /></label>
              </div>
              <label className="grid gap-1"><span className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Harvest date</span><input type="date" value={form.harvest_date} onChange={e=>setForm(s=>({...s, harvest_date: e.target.value}))} className="h-10 rounded-full border border-[#E8E2D6] px-4" /></label>
              <label className="grid gap-1"><span className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Description</span><textarea value={form.description} onChange={e=>setForm(s=>({...s, description: e.target.value}))} placeholder="Hand-harvested, ideal for..." rows={2} className="rounded-[12px] border border-[#E8E2D6] p-3 placeholder:text-[#C2CAD5] focus:outline-none focus:border-[#2E5339]" /></label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Photos — harvest / field (PNG, JPG, JPEG up to 5, 5MB each)</span>
                <input type="file" multiple accept="image/png, image/jpeg, .png, .jpg, .jpeg" onChange={e=>{ const files = Array.from(e.target.files || []).filter(f=> ['image/png','image/jpeg','image/jpg'].includes(f.type) || /\.(png|jpe?g)$/i.test(f.name)).slice(0,5); if (files.length < (e.target.files||[]).length) alert('Only PNG, JPG, JPEG allowed — other files skipped.'); setImageFiles(files)}} className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[#E8F0E9] file:text-[#2E5339] file:font-semibold file:text-xs border border-[#E8E2D6] rounded-full p-1" />
                <span className="text-xs text-[#8A8A8A]">Accepted: PNG, JPG, JPEG only. Low-bandwidth: compresses on upload.</span>
              </label>
              {imageFiles.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {imageFiles.map((f,i) => (
                    <div key={i} className="relative w-20 h-20 rounded-[8px] overflow-hidden border border-[#E8E2D6] bg-[#FAF8F3]">
                      <img src={URL.createObjectURL(f)} alt={`preview ${i}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={()=>setImageFiles(prev=>prev.filter((_,idx)=>idx!==i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#1A1A1A]/70 text-white grid place-items-center text-xs leading-none">×</button>
                      <span className="absolute bottom-0 left-0 right-0 bg-black/45 text-white text-[10px] px-1 truncate">{f.name}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1"><span className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Min bulk qty</span><input type="number" min="1" value={form.min_bulk_quantity} onChange={e=>setForm(s=>({...s, min_bulk_quantity: e.target.value}))} placeholder="5" className="h-10 rounded-full border border-[#E8E2D6] px-4 placeholder:text-[#C2CAD5]" /></label>
                <label className="grid gap-1"><span className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Bulk price</span><input type="number" min="0" step="0.01" value={form.bulk_price} onChange={e=>setForm(s=>({...s, bulk_price: e.target.value}))} placeholder="95" className="h-10 rounded-full border border-[#E8E2D6] px-4 placeholder:text-[#C2CAD5]" /></label>
              </div>
              {formError && <div className="rounded-[12px] bg-[#FDEDEC] border border-[#E8C6C6] p-3 text-sm text-[#B0413E]">{formError}</div>}
              <div className="flex gap-3 pt-1">
                <button onClick={()=>setShowAdd(false)} className="flex-1 h-10 rounded-full border border-[#E8E2D6] bg-white font-medium hover:bg-[#FAF8F3]">Cancel</button>
                <button disabled={create.isPending} onClick={()=>create.mutate()} className="flex-1 h-10 rounded-full bg-[#2E5339] text-white font-semibold hover:bg-[#24412D] disabled:opacity-60">{create.isPending ? 'Listing…' : 'List harvest'}</button>
              </div>
              <p className="text-xs text-[#8A8A8A] text-center">Photos can be added after — listing shows placeholder until Wi-Fi upload (low-bandwidth first).</p>
            </div>
          </div>
        </div>
      )}

      {/* Sales summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-[12px] border border-[#E8E2D6] p-5 shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Daily sales</div>
            <span className="w-8 h-8 rounded-full bg-[#E8F0E9] text-[#2E5339] grid place-items-center shrink-0"><Icon name="analytics" className="w-4 h-4" /></span>
          </div>
          <div className="mt-1 text-xl font-semibold text-[#2E5339]">{fmtPeso(daily)}</div>
          <div className="text-xs text-[#8A8A8A]">{pending} pending order{pending === 1 ? '' : 's'}</div>
        </div>
        <div className="bg-white rounded-[12px] border border-[#E8E2D6] p-5 shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">Weekly totals</div>
            <span className="w-8 h-8 rounded-full bg-[#E8F0E9] text-[#2E5339] grid place-items-center shrink-0"><Icon name="orders" className="w-4 h-4" /></span>
          </div>
          <div className="mt-1 text-xl font-semibold">{fmtPeso(weekly)}</div>
          <div className="text-xs text-[#8A8A8A]">Last 7 days of sales</div>
        </div>
        <div className="bg-[#FFF4D6] rounded-[12px] border border-[#F2D98A] p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[#8A6A0A]">Low-stock alerts</div>
            <span className="w-8 h-8 rounded-full bg-white/70 text-[#8A6A0A] grid place-items-center shrink-0"><Icon name="alert" className="w-4 h-4" /></span>
          </div>
          <div className="mt-1 text-xl font-semibold text-[#8A6A0A]">{lowStock.length} item{lowStock.length === 1 ? '' : 's'}</div>
          <div className="text-xs text-[#8A6A0A] truncate">≤5 left: {lowStock.map(p=>p.name).join(', ') || 'none — all good'}</div>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-[#FDEDEC] rounded-[12px] border border-[#E8C6C6] p-4 flex flex-wrap gap-2 items-center">
          <span className="text-sm font-semibold text-[#B0413E] inline-flex items-center gap-2"><Icon name="alert" className="w-4 h-4" /> Low stock:</span>
          {lowStock.map(p => (
            <span key={p.id} className="inline-flex items-center gap-2 bg-white rounded-full border border-[#E8C6C6] px-3 py-1 text-sm">
              {p.name} — {p.available_quantity} {p.unit_type}
              <button onClick={()=>adjust.mutate({ id: p.id, delta: 10 })} className="h-7 px-3 rounded-full bg-[#2E5339] text-white text-xs font-semibold hover:bg-[#24412D] transition">+10</button>
            </span>
          ))}
        </div>
      )}

      {/* Listings table */}
      <div className="bg-white rounded-[12px] border border-[#E8E2D6] overflow-hidden shadow-[0_4px_12px_rgba(46,83,57,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAF8F3] text-xs font-semibold tracking-[0.06em] uppercase text-[#8A8A8A]">
              <tr><th className="text-left px-4 py-3">Product</th><th className="text-left px-4 py-3">Category · Price</th><th className="text-left px-4 py-3">Stock</th><th className="text-left px-4 py-3">Adjust</th><th className="text-right px-4 py-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-[#F0EDE6]">
              {products.map(p => {
                const soldOut = p.status === 'sold_out' || Number(p.available_quantity) === 0
                return (
                  <tr key={p.id} className={`${soldOut ? 'bg-[#FFFBFB]' : 'hover:bg-[#FAF8F3]/60'} transition`}>
                    <td className="px-4 py-3">
                      <div className="font-medium flex items-center gap-2">
                        {p.image ? <img src={p.image} alt={p.name} className="w-8 h-8 rounded-lg object-cover border border-[#E8E2D6] shrink-0" loading="lazy" /> : <span className="w-8 h-8 rounded-lg bg-[#E8F0E9] flex items-center justify-center text-sm shrink-0" aria-hidden="true">🥬</span>}
                        {p.name} {p.status === 'archived' && <Chip tone="archived" className="!py-0.5">Archived</Chip>}
                      </div>
                      <div className="text-xs text-[#8A8A8A] mt-0.5">Harvest {p.harvest_date || '—'} · {p.status.replace('_', ' ')}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-[#2E5339]">{fmtPeso(p.price_per_unit)} / {p.unit_type}</div>
                      <div className="text-xs text-[#8A8A8A]">{p.category?.name} {p.bulk_price ? `· Bulk ${fmtPeso(p.bulk_price)} @ ${p.min_bulk_quantity}+` : ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Chip tone={Number(p.available_quantity) <= 5 ? 'cancelled' : 'available'}>
                        {p.available_quantity} {p.unit_type}
                      </Chip>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-[200px]">
                        <StockStepper value={Number(p.available_quantity)} unit={p.unit_type} loading={updating===p.id} onDelta={(d)=>adjust.mutate({ id: p.id, delta: d })} />
                        <div className="text-[11px] text-[#8A8A8A] text-center mt-1">One tap — no modal</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={()=>toggleSoldOut.mutate({ id: p.id, soldOut: !soldOut })} className={`h-9 px-3 rounded-full text-xs font-semibold border transition ${soldOut ? 'bg-[#2E5339] text-white border-[#2E5339] hover:bg-[#24412D]' : 'bg-white border-[#E8C6C6] text-[#B0413E] hover:bg-[#FDEDEC]'}`}>
                        {soldOut ? 'Restock +10' : 'Mark sold out'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {products.length===0 && (
          <div className="p-2">
            <EmptyState icon="sprout" title="No listings yet" hint="Add your first harvest from the AniLink mobile app and it will show up here." />
          </div>
        )}
      </div>
    </div>
  )
}
