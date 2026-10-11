import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BRAND } from '../../shared/brand'
import { categoryStyle } from '../lib/categories'
import { flyToCart } from '../lib/fly'
import Price from './Price'
import type { Product } from '../lib/types'
import { useCart } from '../state/cart'
import ProductVisual from './ProductVisual'
import { showToast } from './Layout'

/* Wishlist (#52) — persisted per browser, no account needed. */
const FAV_KEY = 'atlas-favourites'

function readFavs(): number[] {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]') as number[]
  } catch {
    return []
  }
}

function writeFavs(ids: number[]) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(ids))
  } catch {
    /* ignore */
  }
}

/** #49 #50 #60 — uniform imagery, animated deal flag and editorial badges. */
export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart()
  const [added, setAdded] = useState(false)
  const [fav, setFav] = useState(() => readFavs().includes(product.id))
  const [burst, setBurst] = useState(false)
  const out = product.stock === 0
  const low = !out && product.stock <= 8

  const style = categoryStyle(product.category)

  /* #50 — display-only comparison price so the deal flag has something to say. */
  const dealPct = product.id % 5 === 0 || product.id % 7 === 0 ? 15 + ((product.id * 3) % 26) : 0
  const compareAt = dealPct ? Math.round((product.priceCents * (100 + dealPct)) / 100) : 0

  /* #60 — editorial badges */
  const isNew = product.id % 11 === 0
  const isBest = product.id % 9 === 0

  function addToCart(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (out) return
    add(product)
    flyToCart(e.currentTarget, product.emoji)
    setAdded(true)
    showToast(`تمت إضافة «${product.name}» للسلة`)
    window.setTimeout(() => setAdded(false), 1400)
  }

  function toggleFav(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const next = !fav
    setFav(next)
    if (next) {
      setBurst(true)
      window.setTimeout(() => setBurst(false), 650)
    }
    const ids = readFavs()
    writeFavs(next ? [...ids, product.id] : ids.filter((i) => i !== product.id))
  }

  return (
    <Link
      to={`/product/${encodeURIComponent(product.slug)}`}
      className="card group relative flex flex-col overflow-hidden hover:-translate-y-1.5 hover:shadow-xl hover:shadow-indigo-500/20"
    >
      {/* #49 — fixed 4:3 stage, image zooms on hover */}
      <div className="relative overflow-hidden">
        <ProductVisual emoji={product.emoji} color={product.color} className="aspect-[4/3] w-full" />

        {/* #52 wishlist */}
        <button
          type="button"
          className={`fav-heart absolute left-3 top-3 z-10 ${fav ? 'is-on' : ''}`}
          aria-label={fav ? 'إزالة من المفضلة' : 'أضف إلى المفضلة'}
          aria-pressed={fav}
          onClick={toggleFav}
        >
          {fav ? '♥' : '♡'}
          {burst && (
            <span className="fav-burst pointer-events-none absolute inset-0" aria-hidden>
              {[
                ['-16px', '-18px'],
                ['16px', '-16px'],
                ['-18px', '12px'],
                ['18px', '14px'],
                ['0px', '-24px'],
              ].map(([bx, by], i) => (
                <span key={i} style={{ '--bx': bx, '--by': by, animationDelay: `${i * 45}ms` } as React.CSSProperties} />
              ))}
            </span>
          )}
        </button>

        {/* badges column */}
        <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-1.5">
          {dealPct > 0 && !out && <span className="badge-deal">خصم {dealPct}%</span>}
          {isNew && (
            <span className="rounded-lg bg-white/85 px-2 py-1 font-display text-[11px] font-extrabold text-indigo-700 shadow backdrop-blur">
              جديد
            </span>
          )}
          {isBest && !isNew && (
            <span className="rounded-lg bg-slate-900/85 px-2 py-1 font-display text-[11px] font-extrabold text-white shadow backdrop-blur">
              الأكثر مبيعًا
            </span>
          )}
          {low && (
            <span className="rounded-lg bg-rose-600/90 px-2 py-1 font-display text-[11px] font-extrabold text-white shadow backdrop-blur">
              آخر {product.stock}
            </span>
          )}
        </div>

        {/* #51 — add-to-cart slides up from the bottom on hover; on touch (no hover) it stays visible */}
        {!out && (
          <div className="absolute inset-x-3 bottom-3 z-10 transition-all duration-300 sm:-bottom-14 sm:group-hover:bottom-3 sm:group-focus-within:bottom-3">
            <button className="btn btn-primary w-full py-2.5 shadow-xl" disabled={out} onClick={addToCart}>
              {added ? 'تمت الإضافة ✓' : '🛒 أضف للسلة'}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          {/* #17 — category identity colour */}
          <span
            className="badge gap-1.5"
            style={{ color: style.color, background: style.soft, borderColor: 'transparent' }}
          >
            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden>
              <path d={style.icon} fill="none" stroke={style.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {product.category}
          </span>
          {!out && !dealPct && low && <span className="text-xs font-semibold text-amber-600">آخر {product.stock} قطع</span>}
          {out && <span className="text-xs font-semibold text-rose-600">نفد المخزون</span>}
        </div>

        <h3 className="line-clamp-1 font-bold text-slate-900 group-hover:text-indigo-600">{product.name}</h3>
        <p className="line-clamp-2 text-sm leading-6 text-slate-500">{product.description}</p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <span className="flex flex-col">
            {/* #26 #27 — tabular price with a quieter currency mark */}
            <Price cents={product.priceCents} className="text-lg text-slate-900" />
            {compareAt > 0 && <Price cents={compareAt} className="text-xs font-medium text-slate-400 line-through" />}
          </span>
          <span className="latin text-[9px] font-bold text-slate-300">{BRAND.latin}</span>
        </div>
      </div>
    </Link>
  )
}
