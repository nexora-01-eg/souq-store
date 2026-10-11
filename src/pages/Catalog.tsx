import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { BRAND } from '../../shared/brand'
import { categoryStyle } from '../lib/categories'
import Pagination from '../components/Pagination'
import ProductCard from '../components/ProductCard'
import EmptyState from '../components/EmptyState'
import Price from '../components/Price'
import Reveal from '../components/Reveal'
import ProductVisual from '../components/ProductVisual'
import { formatInt } from '../lib/money'
import type { ProductsResponse } from '../lib/types'

const SORT_OPTIONS = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'price_asc', label: 'السعر: من الأقل' },
  { value: 'price_desc', label: 'السعر: من الأعلى' },
  { value: 'name', label: 'الاسم' },
]

/* #78 — the confidence strip under the hero copy. */
const TRUST = [
  ['🚚', 'شحن مجاني', 'لكل طلبات مصر'],
  ['🔒', 'دفع آمن', 'محاكاة بدون خصم'],
  ['↩️', 'إرجاع 14 يوم', 'بدون أسئلة'],
  ['🛡️', 'ضمان سنة', 'على الإلكترونيات'],
]

export default function Catalog() {
  const [params, setParams] = useSearchParams()
  const query = params.toString()
  const search = params.get('search') ?? ''
  const category = params.get('category') ?? ''
  const sort = params.get('sort') ?? 'newest'
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)
  const rawPer = params.get('per')
  const per = rawPer === '24' || rawPer === '48' ? rawPer : '12'
  const view = params.get('view') === 'list' ? 'list' : 'grid'

  const [data, setData] = useState<ProductsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [minInput, setMinInput] = useState(params.get('min') ?? '')
  const [maxInput, setMaxInput] = useState(params.get('max') ?? '')

  const heroRef = useRef<HTMLDivElement | null>(null)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const skipScrollRef = useRef(true)

  useEffect(() => {
    setMinInput(params.get('min') ?? '')
    setMaxInput(params.get('max') ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const qs = new URLSearchParams()
    if (search) qs.set('search', search)
    if (category) qs.set('category', category)
    if (sort) qs.set('sort', sort)
    const min = params.get('min')
    const max = params.get('max')
    if (min && Number.isFinite(Number(min))) qs.set('min', String(Math.round(Number(min) * 100)))
    if (max && Number.isFinite(Number(max))) qs.set('max', String(Math.round(Number(max) * 100)))
    qs.set('page', String(page))
    qs.set('perPage', per)

    api<ProductsResponse>(`/api/products?${qs.toString()}`)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر تحميل المنتجات')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  /* #88 — gentle parallax on the hero backdrop. */
  useEffect(() => {
    const node = heroRef.current
    if (!node) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        node.style.setProperty('--parallax-y', `${Math.min(window.scrollY, 420) * 0.18}px`)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
    scrollToResults()
  }

  function applyPrice(e: FormEvent) {
    e.preventDefault()
    const next = new URLSearchParams(params)
    if (minInput && Number.isFinite(Number(minInput))) next.set('min', minInput)
    else next.delete('min')
    if (maxInput && Number.isFinite(Number(maxInput))) next.set('max', maxInput)
    else next.delete('max')
    next.delete('page')
    setParams(next)
    scrollToResults()
  }

  function clearFilter(key: string) {
    const next = new URLSearchParams(params)
    next.delete(key)
    next.delete('page')
    setParams(next)
    scrollToResults()
  }

  /* #102 — after any filter change, glide down to the results instead of
     leaving the visitor staring at the hero with no feedback. */
  function scrollToResults() {
    if (skipScrollRef.current) return
    const node = toolbarRef.current
    if (!node) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const top = node.getBoundingClientRect().top + window.scrollY - 92
    if (window.scrollY <= top) return
    window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
  }

  useEffect(() => {
    skipScrollRef.current = false
    return () => {
      skipScrollRef.current = true
    }
  }, [])

  /* #55 — every active filter is shown as a removable chip. */
  const chips: { key: string; label: string }[] = []
  if (search) chips.push({ key: 'search', label: `بحث: ${search}` })
  if (category) chips.push({ key: 'category', label: `الفئة: ${category}` })
  if (params.get('min')) chips.push({ key: 'min', label: `من ${params.get('min')} ج.م` })
  if (params.get('max')) chips.push({ key: 'max', label: `حتى ${params.get('max')} ج.م` })

  const hasFilters = chips.length > 0
  const catalogTotal = data?.categories.reduce((sum, c) => sum + c.count, 0) ?? 1200
  const catalogCategories = data?.categories.length ?? 8

  return (
    <div>
      {/* Hero — #16 aurora mesh, #25 eyebrow, #24 display type, #88 parallax */}
      <section className="relative overflow-hidden rounded-b-[2.75rem] text-white">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,#472e81 0%,#4c1d95 45%,#831843 100%)' }} />
        <div ref={heroRef} className="parallax absolute inset-0 opacity-90" style={{ background: 'var(--atlas-aurora)' }} />
        <span aria-hidden className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        {/* #4 — ghost monogram watermark */}
        <span
          aria-hidden
          className="watermark pointer-events-none absolute -bottom-10 left-4 text-[16vw] leading-none"
          style={{ WebkitTextStrokeColor: 'rgba(255,255,255,.18)' }}
        >
          {BRAND.latin}
        </span>

        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <span className="eyebrow" style={{ color: 'rgba(255,255,255,.75)' }}>
              {BRAND.latin} — EGYPT
            </span>
            <h1 className="display mt-4 text-3xl text-white md:text-5xl">
              كل اللي محتاجه — <span className="text-gradient" style={{ backgroundImage: 'linear-gradient(120deg,#fde68a,#f0abfc,#ada5fc)' }}>في مكان واحد</span>
            </h1>
            <p className="mt-4 max-w-lg text-base leading-8 text-indigo-100">
              {BRAND.name} بيقدملك تشكيلة كاملة من السلع الأصلية — اتصفح، حط في السلة، وخلص الطلب في أقل من دقيقة.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <Link to="/about" className="btn btn-primary !rounded-full px-6 py-2.5">
                تعرّف على {BRAND.name}
              </Link>
              <Link to="/policies" className="btn !rounded-full border border-white/40 bg-white/10 px-6 py-2.5 text-white hover:bg-white/20">
                سياساتنا
              </Link>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold backdrop-blur">
              أكثر من {formatInt(catalogTotal)} منتج في {catalogCategories} فئات
            </div>
          </div>

          {/* #78 trust strip */}
          <div className="grid gap-3 sm:grid-cols-2">
            {TRUST.map(([icon, title, text], i) => (
              <Reveal key={title} delay={i * 90}>
                <div className="glass flex items-center gap-3 rounded-2xl bg-white/10 p-3.5 text-white ring-1 ring-white/20">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 text-xl">{icon}</span>
                  <span className="flex flex-col">
                    <span className="font-display text-sm font-bold">{title}</span>
                    <span className="text-xs text-indigo-100">{text}</span>
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="fade-in mx-auto max-w-7xl px-4 py-8">
        {/* Category chips — #17 tinted with each category's own colour.
            #103 on mobile they scroll horizontally instead of stacking into a tall wall. */}
        <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
          <button
            className={`shrink-0 snap-start rounded-full px-4 py-1.5 text-sm font-medium backdrop-blur transition ${
              !category ? 'text-white shadow-lg shadow-indigo-500/30' : 'bg-white/60 text-slate-600 ring-1 ring-white/70 hover:bg-white/90'
            }`}
            style={!category ? { backgroundImage: 'var(--atlas-grad)' } : undefined}
            onClick={() => setParam('category', '')}
          >
            الكل
          </button>
          {(data?.categories ?? []).map((c) => {
            const s = categoryStyle(c.category)
            const active = category === c.category
            return (
              <button
                key={c.category}
                className={`flex shrink-0 snap-start items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium backdrop-blur transition ${
                  active ? 'text-white shadow-lg' : 'bg-white/60 text-slate-600 ring-1 ring-white/70 hover:bg-white/90'
                }`}
                style={active ? { backgroundImage: `linear-gradient(135deg, ${s.color}, ${s.color}cc)`, boxShadow: `0 8px 22px -10px ${s.color}` } : undefined}
                onClick={() => setParam('category', c.category)}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
                  <path
                    d={s.icon}
                    fill="none"
                    stroke={active ? '#fff' : s.color}
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {c.category} <span className="opacity-60">({c.count})</span>
              </button>
            )
          })}
        </div>

        {/* #55 removable active-filter chips */}
        {hasFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">الفلاتر:</span>
            {chips.map((c) => (
              <button
                key={c.key}
                onClick={() => clearFilter(c.key)}
                className="pop group inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-300/50 transition hover:bg-indigo-500/20"
              >
                {c.label}
                <span aria-hidden className="grid h-4 w-4 place-items-center rounded-full bg-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white">
                  ×
                </span>
                <span className="sr-only">إزالة الفلتر</span>
              </button>
            ))}
            <button
              className="text-xs font-semibold text-rose-600 underline-offset-2 hover:underline"
              onClick={() => setParams(new URLSearchParams())}
            >
              مسح الكل
            </button>
          </div>
        )}

        {/* Toolbar — #102 sticks under the header so sort/view stay reachable on long pages */}
        <div ref={toolbarRef} className="glass mt-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl p-4 md:sticky md:top-[4.5rem] md:z-20 md:shadow-lg md:shadow-slate-500/5">
          <form onSubmit={applyPrice} className="flex items-center gap-2">
            <input
              className="input w-28"
              placeholder="أقل سعر"
              inputMode="decimal"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              aria-label="أقل سعر"
            />
            <span className="text-slate-400">—</span>
            <input
              className="input w-28"
              placeholder="أعلى سعر"
              inputMode="decimal"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              aria-label="أعلى سعر"
            />
            <button className="btn btn-ghost" type="submit">
              تطبيق
            </button>
            {hasFilters && (
              <button className="btn btn-ghost" type="button" onClick={() => setParams(new URLSearchParams())}>
                مسح الفلاتر
              </button>
            )}
          </form>

          <div className="flex flex-wrap items-center gap-3">
            {/* #57 — result count fades in whenever the query changes (#102 polite live region) */}
            <span key={query} aria-live="polite" className="fade-in tnum text-sm font-semibold text-slate-500">
              {loading ? '…' : `${formatInt(data?.total ?? 0)} نتيجة`}
            </span>

            {/* #54 — grid / list switch */}
            <div className="flex overflow-hidden rounded-xl border border-white/70 bg-white/50 backdrop-blur" role="group" aria-label="طريقة العرض">
              {(['grid', 'list'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setParam('view', v === 'grid' ? '' : v)}
                  aria-pressed={view === v}
                  title={v === 'grid' ? 'عرض شبكي' : 'عرض قائمة'}
                  className={`px-3 py-2 text-sm transition ${view === v ? 'text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
                  style={view === v ? { backgroundImage: 'var(--atlas-grad)' } : undefined}
                >
                  {v === 'grid' ? '▦' : '☰'}
                </button>
              ))}
            </div>

            <select className="input w-36" value={per} onChange={(e) => setParam('per', e.target.value)} aria-label="عدد المنتجات في الصفحة">
              <option value="12">12 / صفحة</option>
              <option value="24">24 / صفحة</option>
              <option value="48">48 / صفحة</option>
            </select>

            <select className="input w-40" value={sort} onChange={(e) => setParam('sort', e.target.value)} aria-label="ترتيب">
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {search && (
          <p className="mt-4 text-sm text-slate-600">
            نتائج البحث عن: <strong>{search}</strong>
          </p>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        {/* #53 shaped skeletons */}
        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton-card h-72">
                <div className="skeleton h-40 w-full rounded-t-3xl" />
                <div className="space-y-2 p-4">
                  <div className="skeleton h-3 w-20 rounded-full" />
                  <div className="skeleton h-4 w-full rounded-full" />
                  <div className="skeleton h-4 w-2/3 rounded-full" />
                  <div className="skeleton h-7 w-28 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (data?.items.length ?? 0) === 0 ? (
          /* #58 */
          <div className="mt-6">
            <EmptyState
              title="لا توجد منتجات مطابقة"
              text="جرّب كلمة بحث مختلفة أو امسح الفلاتر عشان تشوف كل حاجة عندنا."
              actionLabel="عرض كل المنتجات"
              onAction={() => setParams(new URLSearchParams())}
            />
          </div>
        ) : view === 'grid' ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data!.items.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 70}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        ) : (
          /* #54 list view */
          <div className="mt-6 space-y-4">
            {data!.items.map((p, i) => {
              const s = categoryStyle(p.category)
              return (
                <Reveal key={p.id} delay={Math.min(i, 6) * 50}>
                  <Link to={`/product/${encodeURIComponent(p.slug)}`} className="card group flex items-center gap-4 p-3 hover:shadow-lg hover:shadow-indigo-500/15">
                    <ProductVisual emoji={p.emoji} color={p.color} className="h-24 w-24 shrink-0 rounded-2xl sm:h-28 sm:w-36" emojiClass="text-4xl" />
                    <div className="min-w-0 flex-1">
                      <span className="badge" style={{ color: s.color, background: s.soft, borderColor: 'transparent' }}>
                        {p.category}
                      </span>
                      <h3 className="mt-1.5 line-clamp-1 font-bold text-slate-900 group-hover:text-indigo-600">{p.name}</h3>
                      <p className="line-clamp-2 mt-1 text-sm leading-6 text-slate-500">{p.description}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 sm:gap-2">
                      <Price cents={p.priceCents} className="text-base text-slate-900 sm:text-xl" />
                      <span className={`pill ${p.stock === 0 ? 'pill-bad' : p.stock <= 8 ? 'pill-warn' : 'pill-ok'}`}>
                        {p.stock === 0 ? 'نفد' : `${p.stock} متاح`}
                      </span>
                    </div>
                  </Link>
                </Reveal>
              )
            })}
          </div>
        )}

        <Pagination page={data?.page ?? 1} pages={data?.pages ?? 1} onPage={(p) => setParam('page', String(p))} />
      </div>
    </div>
  )
}
