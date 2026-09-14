import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../lib/api'
import ProductCard from '../components/ProductCard'

const sorts = [
  { value: 'fresh', label: 'Freshest' },
  { value: 'price_low', label: 'Price ↑' },
  { value: 'price_high', label: 'Price ↓' },
  { value: 'distance', label: 'Nearest' },
]

export default function Browse() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('fresh')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [near, setNear] = useState('')
  const [page, setPage] = useState(1)

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: api.categories })
  const { data: regions } = useQuery({ queryKey: ['regions'], queryFn: () => api.regions() })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', { search, category, sort, verifiedOnly, page }],
    queryFn: () => api.products({
      search: search || undefined,
      category: category || undefined,
      sort,
      verified_only: verifiedOnly ? 1 : undefined,
      near: near || undefined,
      page,
    }),
    placeholderData: keepPreviousData,
  })

  const products = data?.data ?? []
  const lastPage = data?.last_page ?? 1

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AniMarket</h1>
          <p className="text-sm text-[#5C5C5C] mt-1">Fresh harvests straight from Filipino farms.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-[#5C5C5C] cursor-pointer">
          <input type="checkbox" checked={verifiedOnly} onChange={(e) => { setVerifiedOnly(e.target.checked); setPage(1) }}
            className="w-4 h-4 accent-[#2E5339]" />
          Verified farms only
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search produce, category…"
            className="w-full border border-[#E8E2D6] bg-white rounded-[12px] pl-4 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#2E5339]"
          />
        </div>
        <select value={near} onChange={(e) => { setNear(e.target.value); setPage(1) }}
          className="border border-[#E8E2D6] bg-white rounded-[12px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#2E5339]" aria-label="Near me">
          <option value="">Near me…</option>
          {(regions ?? []).map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1) }}
          className="border border-[#E8E2D6] bg-white rounded-[12px] px-3 py-2.5 text-sm focus:outline-none focus:border-[#2E5339]">
          {sorts.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => { setCategory(''); setPage(1) }}
          className={`shrink-0 px-4 py-2 rounded-full text-sm border transition ${category === '' ? 'bg-[#2E5339] border-[#2E5339] text-white font-semibold' : 'bg-white border-[#E8E2D6] text-[#5C5C5C] hover:border-[#C5D9C7]'}`}
        >
          All
        </button>
        {(categories ?? []).map(c => (
          <button
            key={c.id}
            onClick={() => { setCategory(c.slug); setPage(1) }}
            className={`shrink-0 px-4 py-2 rounded-full text-sm border transition ${category === c.slug ? 'bg-[#2E5339] border-[#2E5339] text-white font-semibold' : 'bg-white border-[#E8E2D6] text-[#5C5C5C] hover:border-[#C5D9C7]'}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="aspect-[4/5] bg-white border border-[#E8E2D6] rounded-[16px] animate-pulse" />)}
        </div>
      ) : isError ? (
        <div className="text-sm text-[#B0413E] bg-[#F6E3E2] border border-[#E5B9B6] rounded-[12px] px-4 py-3">Could not load the market. Please refresh.</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-[#8A8A8A]">
          <div className="text-4xl mb-3">🧺</div>
          No harvests match your search yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="px-4 py-2 rounded-[10px] text-sm bg-white border border-[#E8E2D6] disabled:opacity-40 hover:border-[#C5D9C7]">
            Previous
          </button>
          <span className="text-sm text-[#5C5C5C] px-2">Page {data?.current_page} of {lastPage}</span>
          <button disabled={page >= lastPage} onClick={() => setPage(page + 1)}
            className="px-4 py-2 rounded-[10px] text-sm bg-white border border-[#E8E2D6] disabled:opacity-40 hover:border-[#C5D9C7]">
            Next
          </button>
        </div>
      )}
    </div>
  )
}
