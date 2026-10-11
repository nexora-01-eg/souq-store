import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { BRAND } from '../../shared/brand'
import Breadcrumbs from '../components/Breadcrumbs'
import Price from '../components/Price'
import ProductCard from '../components/ProductCard'
import ProductVisual from '../components/ProductVisual'
import Reveal from '../components/Reveal'
import { categoryStyle } from '../lib/categories'
import { flyToCart } from '../lib/fly'
import type { Product, ProductsResponse } from '../lib/types'
import { useCart } from '../state/cart'

type PageState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; product: Product }

/* #61 — four deterministic "shots" per product, each with its own angle. */
const SHOTS = [135, 205, 45, 315]

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const { add } = useCart()
  const [state, setState] = useState<PageState>({ kind: 'loading' })
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [related, setRelated] = useState<Product[]>([])
  const [shot, setShot] = useState(0)
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setState({ kind: 'loading' })
    setQty(1)
    setAdded(false)
    setShot(0)
    setZoom(null)
    api<Product>(`/api/products/${encodeURIComponent(slug)}`)
      .then((product) => {
        if (cancelled) return
        setState({ kind: 'ready', product })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setState({ kind: 'error', message: e instanceof Error ? e.message : 'تعذر تحميل المنتج' })
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const product = state.kind === 'ready' ? state.product : null

  useEffect(() => {
    if (!product) return
    let cancelled = false
    api<ProductsResponse>(`/api/products?category=${encodeURIComponent(product.category)}`)
      .then((d) => {
        if (!cancelled) setRelated(d.items.filter((p) => p.id !== product.id).slice(0, 8))
      })
      .catch(() => {
        if (!cancelled) setRelated([])
      })
    return () => {
      cancelled = true
    }
  }, [product])

  if (state.kind === 'loading') {
    return (
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2">
        <div className="skeleton aspect-[4/3] rounded-[2rem]" />
        <div className="space-y-4">
          <div className="skeleton h-4 w-24 rounded-full" />
          <div className="skeleton h-8 w-3/4 rounded-full" />
          <div className="skeleton h-5 w-32 rounded-full" />
          <div className="skeleton h-24 w-full rounded-3xl" />
        </div>
      </div>
    )
  }

  if (state.kind === 'error') {
    return (
      <div className="mx-auto grid max-w-2xl place-items-center gap-4 px-4 py-20 text-center">
        <span className="text-6xl">🧐</span>
        <h1 className="display text-2xl">{state.message}</h1>
        <Link to="/" className="btn btn-primary">
          العودة إلى الكتالوج
        </Link>
      </div>
    )
  }

  const p = product!
  const style = categoryStyle(p.category)
  const maxQty = Math.min(p.stock, 10)
  const out = p.stock === 0
  const sku = `ATLAS-${String(p.id).padStart(5, '0')}`

  /* #65 — deterministic demo rating + distribution (plain computation: a hook
     here would run after the loading/error early returns and break the rules of hooks) */
  const rating = Math.round((3.7 + ((p.id * 7) % 14) / 10) * 10) / 10
  const ratingCapped = Math.min(5, rating)
  const distribution = [5, 4, 3, 2, 1].map((stars, i) => {
    const spread = [0.68, 0.2, 0.07, 0.03, 0.02][i]
    const tilt = 1 + (((p.id + stars) % 5) - 2) * 0.12
    return { stars, pct: Math.max(2, Math.round(spread * tilt * 100)) }
  })
  const soldCount = 40 + ((p.id * 37) % 900)

  /* #63 stock gauge */
  const stockPct = Math.max(6, Math.min(100, Math.round((p.stock / Math.max(p.stock, 40)) * 100)))

  function addToCart() {
    add(p, qty)
    flyToCart(stageRef.current, p.emoji)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 2000)
  }

  /* #62 — magnifier lens follows the pointer over the stage */
  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = stageRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setZoom({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  const specs: [string, string][] = [
    ['العلامة التجارية', BRAND.name],
    ['رمز المنتج', sku],
    ['الفئة', p.category],
    ['بلد المنشأ', 'مصر 🇪🇬'],
    ['الضمان', p.category === 'إلكترونيات' ? '12 شهر' : '6 أشهر'],
    ['التوفر', out ? 'غير متوفر' : `${p.stock} قطعة بالمخزون`],
  ]

  const reviews = 12 + ((p.id * 13) % 380)

  return (
    <div className="fade-in mx-auto max-w-6xl px-4 py-8">
      <Breadcrumbs items={[{ label: 'الكتالوج', to: '/' }, { label: p.category, to: `/?category=${encodeURIComponent(p.category)}` }, { label: p.name }]} />

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        {/* #61 #62 — gallery with thumbnails and a zoom lens */}
        <div>
          <div
            ref={stageRef}
            className="group relative overflow-hidden rounded-[2rem] shadow-2xl shadow-slate-900/25 ring-1 ring-white/60"
            onMouseMove={onMove}
            onMouseLeave={() => setZoom(null)}
          >
            <div
              className="transition-transform duration-300 ease-out"
              style={{
                transform: zoom ? 'scale(1.85)' : 'scale(1)',
                transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : 'center',
              }}
            >
              <ProductVisual
                emoji={p.emoji}
                color={p.color}
                angle={SHOTS[shot]}
                className="aspect-[4/3] w-full"
                emojiClass={shot % 2 ? 'text-7xl' : 'text-8xl'}
              />
            </div>

            <span
              aria-hidden
              className="pointer-events-none absolute h-28 w-28 rounded-full border-2 border-white/70 shadow-[0_0_0_9999px_rgba(15,23,42,.35)] transition-opacity duration-200"
              style={{
                left: `calc(${zoom?.x ?? 50}% - 3.5rem)`,
                top: `calc(${zoom?.y ?? 50}% - 3.5rem)`,
                opacity: zoom ? 1 : 0,
              }}
            />

            {out ? (
              <span className="absolute bottom-4 start-4 rounded-xl bg-rose-600/90 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                نفد المخزون
              </span>
            ) : (
              <span className="glass absolute bottom-4 start-4 rounded-2xl px-4 py-2 text-sm font-bold text-slate-700">
                ✔ متوفر في المتجر
              </span>
            )}
          </div>

          {/* thumbnails */}
          <div className="mt-3 grid grid-cols-4 gap-3">
            {SHOTS.map((angle, i) => (
              <button
                key={angle}
                onClick={() => setShot(i)}
                aria-label={`صورة ${i + 1}`}
                aria-pressed={shot === i}
                className={`overflow-hidden rounded-2xl ring-2 transition ${
                  shot === i ? 'ring-indigo-500' : 'ring-white/60 hover:ring-indigo-300'
                }`}
              >
                <ProductVisual
                  emoji={p.emoji}
                  color={p.color}
                  angle={angle}
                  className="aspect-[4/3] w-full"
                  emojiClass="text-2xl"
                />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge" style={{ color: style.color, background: style.soft, borderColor: 'transparent' }}>
              {p.category}
            </span>
            {out ? (
              <span className="pill pill-bad">نفد المخزون</span>
            ) : p.stock <= 8 ? (
              <span className="pill pill-warn">باقي {p.stock} قطع فقط</span>
            ) : (
              <span className="pill pill-ok">متوفر ({p.stock} قطعة)</span>
            )}
            {/* #70 — social proof */}
            <span className="badge">🔥 اتباع {soldCount} قطعة</span>
          </div>

          <h1 className="display text-3xl md:text-4xl">{p.name}</h1>

          {/* #65 — rating summary */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1" aria-label={`التقييم ${rating} من 5`}>
              <span className="font-display text-lg font-extrabold text-amber-500">{rating}</span>
              <span className="text-amber-500" aria-hidden>{'★'.repeat(Math.round(ratingCapped))}</span>
              <span className="text-slate-300" aria-hidden>{'★'.repeat(5 - Math.round(ratingCapped))}</span>
            </span>
            <span className="text-sm text-slate-500 tnum">({reviews} تقييم)</span>
          </div>

          <p className="text-lg leading-8 text-slate-600">{p.description}</p>

          <div className="flex items-end gap-3">
            <Price cents={p.priceCents} className="text-gradient text-4xl" />
            <span className="badge mb-1">شامل الضريبة</span>
          </div>

          {/* #63 — stock gauge */}
          {!out && (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>{p.stock <= 8 ? `⚠ بقي ${p.stock} فقط` : 'المخزون متاح'}</span>
                <span className="tnum">{p.stock} قطعة</span>
              </div>
              <div className="stock-track" role="progressbar" aria-valuenow={p.stock} aria-valuemin={0} aria-valuemax={40} aria-label="المخزون المتبقي">
                <div className="stock-fill" style={{ width: `${stockPct}%` }} />
              </div>
            </div>
          )}

          {!out && (
            <div className="flex items-center gap-4">
              {/* #68 — glass stepper */}
              <div className="glass flex items-center rounded-2xl">
                <button
                  className="h-11 w-11 text-lg text-slate-600 transition hover:text-indigo-600 disabled:opacity-40"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  aria-label="إنقاص"
                >
                  −
                </button>
                <span className="tnum w-10 text-center font-display font-bold">{qty}</span>
                <button
                  className="h-11 w-11 text-lg text-slate-600 transition hover:text-indigo-600 disabled:opacity-40"
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  disabled={qty >= maxQty}
                  aria-label="زيادة"
                >
                  +
                </button>
              </div>
              <span className="tnum text-sm text-slate-500">الحد المتاح: {maxQty}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-primary px-7 py-3 text-base" disabled={out} onClick={addToCart}>
              {out ? 'غير متوفر' : '🛒 أضف إلى السلة'}
            </button>
            {added && (
              <Link to="/cart" className="btn btn-ghost text-emerald-700 ring-1 ring-emerald-300">
                تمت الإضافة — الذهاب للسلة ←
              </Link>
            )}
          </div>

          {/* #69 — icon row of guarantees */}
          <div className="grid grid-cols-3 gap-2">
            {[
              ['🚚', 'شحن مجاني', 'كل الطلبات'],
              ['↩️', 'إرجاع', 'خلال 14 يوم'],
              ['🛡️', 'ضمان', p.category === 'إلكترونيات' ? '12 شهر' : '6 أشهر'],
            ].map(([icon, title, sub]) => (
              <div key={title} className="glass flex flex-col items-center gap-0.5 rounded-2xl px-2 py-3 text-center">
                <span className="text-xl">{icon}</span>
                <span className="text-[11px] font-bold text-slate-700">{title}</span>
                <span className="text-[10px] text-slate-400">{sub}</span>
              </div>
            ))}
          </div>

          {/* #64 — spec table */}
          <div className="glass overflow-hidden rounded-2xl">
            <table className="w-full">
              <caption className="px-4 pt-4 text-start font-display text-sm font-bold text-slate-900">
                المواصفات
              </caption>
              <tbody>
                {specs.map(([k, v], i) => (
                  <tr key={k} className={i % 2 ? 'bg-white/30' : ''}>
                    <th scope="row" className="w-2/5 px-4 py-2.5 text-start text-xs font-semibold text-slate-500">
                      {k}
                    </th>
                    <td className="px-4 py-2.5 text-sm font-medium text-slate-800">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* #65 — rating distribution */}
      <section className="glass mt-12 rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="display text-xl">تقييمات العملاء</h2>
          <span className="badge">بيانات تجريبية</span>
        </div>
        <div className="mt-5 grid gap-6 sm:grid-cols-[auto,1fr] sm:items-center">
          <div className="flex flex-col items-center">
            <span className="tnum display text-5xl text-gradient">{rating}</span>
            <span className="mt-1 text-amber-500" aria-hidden>{'★'.repeat(Math.round(ratingCapped))}</span>
            <span className="tnum mt-1 text-xs text-slate-500">{reviews} تقييم</span>
          </div>
          <div className="space-y-2">
            {distribution.map((d) => (
              <div key={d.stars} className="flex items-center gap-3 text-xs">
                <span className="tnum w-10 shrink-0 font-semibold text-slate-500">{d.stars} نجوم</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-300/40">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{ width: `${d.pct}%`, backgroundImage: 'linear-gradient(90deg,#f59e0b,#fbbf24)' }}
                  />
                </div>
                <span className="tnum w-9 shrink-0 text-end font-bold text-slate-600">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-14">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <span className="eyebrow">Related</span>
              <h2 className="display mt-1.5 text-xl">منتجات مشابهة</h2>
            </div>
            <Link to={`/?category=${encodeURIComponent(p.category)}`} className="btn btn-ghost text-xs">
              عرض كل {p.category} ←
            </Link>
          </div>

          {/* #66 — draggable horizontal carousel */}
          <div className="-mx-4 flex snap-x gap-5 overflow-x-auto px-4 pb-4 [scrollbar-width:thin]">
            {related.map((r, i) => (
              <Reveal key={r.id} delay={i * 60} className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[23%]">
                <ProductCard product={r} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* #67 — sticky mobile buy bar */}
      {!out && (
        <div className="glass-strong fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-white/60 px-4 py-3 md:hidden">
          <div className="flex flex-col">
            <Price cents={p.priceCents} className="text-lg text-slate-900" />
            <span className="tnum text-[11px] text-slate-500">{p.stock} قطعة متاحة</span>
          </div>
          <button className="btn btn-primary flex-1 py-3" onClick={addToCart}>
            {added ? 'تمت الإضافة ✓' : '🛒 أضف للسلة'}
          </button>
        </div>
      )}
    </div>
  )
}
