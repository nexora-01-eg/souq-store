import { Link } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs'
import EmptyState from '../components/EmptyState'
import Price from '../components/Price'
import ProductVisual from '../components/ProductVisual'
import { formatEgp } from '../lib/money'
import { useCart } from '../state/cart'

export default function CartPage() {
  const { items, setQty, remove, totalCents } = useCart()

  /* #99 */
  if (items.length === 0) {
    return (
      <div className="fade-in mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          title="سلتك فاضية"
          text="ابدأ التسوق من الكتالوج وأضف منتجاتك المفضلة — في أكتر من 1200 اختيار."
          actionLabel="تصفح المنتجات"
          actionTo="/"
        />
      </div>
    )
  }

  return (
    <div className="fade-in mx-auto max-w-6xl px-4 py-8">
      <Breadcrumbs items={[{ label: 'سلة التسوق' }]} />
      <h1 className="display mt-3 text-2xl md:text-3xl">سلة التسوق</h1>
      <p className="tnum mt-1 text-sm text-slate-500">{items.length} منتج مختلف في السلة</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {items.map((item, i) => (
            <div key={item.id} className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              <Link to={`/product/${encodeURIComponent(item.slug)}`} className="group shrink-0">
                <ProductVisual emoji={item.emoji} color={item.color} className="h-20 w-20 rounded-xl" emojiClass="text-3xl" />
              </Link>

              <div className="min-w-0 flex-1">
                <span className="tnum text-[11px] font-bold text-slate-400">
                  #{String(i + 1).padStart(2, '0')}
                </span>
                <Link
                  to={`/product/${encodeURIComponent(item.slug)}`}
                  className="line-clamp-1 font-bold text-slate-900 hover:text-indigo-600"
                >
                  {item.name}
                </Link>
                <div className="mt-1 text-sm text-slate-500">
                  <Price cents={item.priceCents} className="text-sm" /> للقطعة
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  المخزون المتاح: <span className={`tnum ${item.stock <= 5 ? 'text-amber-600' : ''}`}>{item.stock}</span>
                </div>
              </div>

              <div className="mx-auto flex flex-col items-center gap-2 sm:mx-0">
                <div className="glass flex items-center rounded-2xl">
                  <button
                    className="h-10 w-10 text-slate-600 transition hover:text-indigo-600 disabled:opacity-40"
                    onClick={() => setQty(item.id, item.qty - 1)}
                    disabled={item.qty <= 1}
                    aria-label="إنقاص"
                  >
                    −
                  </button>
                  <span className="tnum w-9 text-center font-display font-bold">{item.qty}</span>
                  <button
                    className="h-10 w-10 text-slate-600 transition hover:text-indigo-600 disabled:opacity-40"
                    onClick={() => setQty(item.id, item.qty + 1)}
                    disabled={item.qty >= Math.min(item.stock, 99)}
                    aria-label="زيادة"
                  >
                    +
                  </button>
                </div>
                <button className="text-xs text-rose-600 transition hover:text-rose-700 hover:underline" onClick={() => remove(item.id)}>
                  حذف 🗑
                </button>
              </div>

              {/* mobile: full-width total line — the fixed column would overflow 390px */}
              <div className="w-full border-t border-dashed border-slate-200 pt-2 text-end sm:w-28 sm:border-0 sm:pt-0">
                <Price cents={item.qty * item.priceCents} className="text-slate-900" />
              </div>
            </div>
          ))}
        </div>

        {/* #73 — dotted leader summary */}
        <div className="card h-fit p-6">
          <span className="eyebrow">Summary</span>
          <h2 className="display mt-1.5 text-lg">ملخص الطلب</h2>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="leader">
              <dt className="text-slate-500">المجموع الفرعي</dt>
              <dd className="tnum font-semibold text-slate-800">{formatEgp(totalCents)}</dd>
            </div>
            <div className="leader">
              <dt className="text-slate-500">الشحن</dt>
              <dd className="font-semibold text-emerald-600">مجاني 🎉</dd>
            </div>
            <div className="leader">
              <dt className="text-slate-500">الضريبة (14%)</dt>
              <dd className="font-semibold text-slate-400">مشمولة</dd>
            </div>
            <div className="border-t border-dashed border-slate-200 pt-4">
              <div className="leader">
                <dt className="font-display text-base font-bold text-slate-900">الإجمالي</dt>
                <dd>
                  <Price cents={totalCents} className="text-gradient text-xl" />
                </dd>
              </div>
            </div>
          </dl>

          <Link to="/checkout" className="btn btn-primary mt-6 w-full py-3">
            إتمام الشراء ←
          </Link>
          <Link to="/" className="btn btn-ghost mt-3 w-full">
            متابعة التسوق
          </Link>

          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <span aria-hidden>🔒</span> دفع تجريبي آمن — لا يُخصم أي مبلغ
          </div>
        </div>
      </div>
    </div>
  )
}
