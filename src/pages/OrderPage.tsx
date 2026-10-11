import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../api'
import { BRAND } from '../../shared/brand'
import Confetti from '../components/Confetti'
import Price from '../components/Price'
import { formatEgp } from '../lib/money'
import { STATUS_LABELS, type Order } from '../lib/types'

function readSession(id: string): Order | null {
  try {
    const raw = sessionStorage.getItem(`souq-order-${id}`)
    return raw ? (JSON.parse(raw) as Order) : null
  } catch {
    return null
  }
}

/* #77 — hand-drawn tick that strokes itself in. */
function SuccessCheck() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" role="img" aria-label="تم بنجاح">
      <defs>
        <linearGradient id="atlas-check" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#06d4c2" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill="url(#atlas-check)" opacity="0.15" />
      <circle cx="32" cy="32" r="29" fill="none" stroke="url(#atlas-check)" strokeWidth="3" />
      <path
        d="M20 33.5 L28.5 42 L45 24"
        fill="none"
        stroke="url(#atlas-check)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="44"
        strokeDashoffset="44"
        style={{ animation: 'draw-check .7s .15s cubic-bezier(.16,1,.3,1) forwards' }}
      />
    </svg>
  )
}

function readCoupon(): { code: string; pct: number; offCents: number } | null {
  try {
    const raw = sessionStorage.getItem('atlas-coupon')
    return raw ? (JSON.parse(raw) as { code: string; pct: number; offCents: number }) : null
  } catch {
    return null
  }
}

export default function OrderPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const initial = (location.state as { order?: Order } | null)?.order ?? (id ? readSession(id) : null)

  const [order, setOrder] = useState<Order | null>(initial)
  const [state, setState] = useState<'ready' | 'loading' | 'error'>(initial ? 'ready' : 'loading')

  useEffect(() => {
    if (initial || !id) return
    let cancelled = false
    api<Order>(`/api/orders/${id}`)
      .then((o) => {
        if (cancelled) return
        setOrder(o)
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (state === 'loading') {
    return (
      <div className="mx-auto grid max-w-2xl place-items-center gap-4 px-4 py-20 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <p className="text-slate-500">جارٍ تحميل الطلب...</p>
      </div>
    )
  }

  if (state === 'error' || !order) {
    return (
      <div className="mx-auto grid max-w-2xl place-items-center gap-4 px-4 py-20 text-center">
        <span className="text-6xl">🤔</span>
        <h1 className="text-2xl font-bold">لا يمكن عرض هذا الطلب</h1>
        <p className="text-slate-500">ربما فتحت الرابط من جهاز آخر أو بدون جلسة تسجيل الدخول.</p>
        <Link to="/" className="btn btn-primary">
          العودة للمتجر
        </Link>
      </div>
    )
  }

  const cancelled = order.status === 'cancelled'
  const coupon = readCoupon()

  return (
    <div className="fade-in mx-auto max-w-3xl px-4 py-10">
      {!cancelled && <Confetti />}
      <div className="card overflow-hidden">
        <div
          className={`px-6 py-8 text-center backdrop-blur ${
            cancelled ? 'bg-amber-500/10' : 'bg-gradient-to-br from-emerald-500/15 to-teal-500/10'
          }`}
        >
          <div
            className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${
              cancelled ? 'bg-amber-100/80 text-3xl' : ''
            }`}
          >
            {cancelled ? '⚠️' : <SuccessCheck />}
          </div>
          <h1 className="mt-4 display text-2xl md:text-3xl">
            {cancelled ? 'تم إلغاء الطلب' : 'تم استلام طلبك بنجاح!'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {cancelled
              ? 'تم إعادة المنتجات إلى المخزون.'
              : `شكرًا لتسوقك من ${BRAND.name} — سيتواصل معك مندوبنا خلال 24-48 ساعة للتأكيد.`}
          </p>
          <div className="mt-4 inline-flex items-center gap-3 rounded-full bg-white px-4 py-2 text-sm shadow-sm">
            <span className="text-slate-500">رقم الطلب</span>
            <span className="font-mono font-bold text-slate-900">#{order.id}</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                order.status === 'shipped'
                  ? 'bg-sky-100 text-sky-700'
                  : cancelled
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {STATUS_LABELS[order.status]}
            </span>
          </div>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">بيانات التوصيل</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">الاسم</dt>
                <dd className="font-semibold">{order.customerName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">الهاتف</dt>
                <dd className="font-semibold" dir="ltr">
                  {order.phone}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">العنوان</dt>
                <dd className="text-end font-semibold">{order.address}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">التاريخ</dt>
                <dd className="font-semibold">{order.createdAt}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900">المنتجات</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {order.items.map((it) => (
                <li key={it.productId} className="flex justify-between gap-3">
                  <span className="text-slate-600">
                    {it.name} <span className="text-slate-400">×{it.qty}</span>
                  </span>
                  <span className="font-semibold">{formatEgp(it.priceCents * it.qty)}</span>
                </li>
              ))}
            </ul>
            {coupon && (
              <div className="mt-3 flex justify-between text-sm text-indigo-600">
                <span className="font-semibold">كوبون {coupon.code} (−{coupon.pct}%)</span>
                <span className="tnum font-semibold">−{formatEgp(coupon.offCents)}</span>
              </div>
            )}
            <div className="mt-3 flex justify-between border-t border-dashed border-slate-200 pt-3">
              <span className="font-display font-bold text-slate-900">الإجمالي المدفوع</span>
              <Price cents={Math.max(0, order.totalCents - (coupon?.offCents ?? 0))} className="text-gradient text-lg" />
            </div>
            <div className="mt-1 text-xs text-slate-400">شامل الشحن (مجاني) — المبلغ يظهر كخصم تجريبي والدفع محاكى</div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 border-t border-white/60 bg-white/40 px-6 py-4 backdrop-blur">
          <Link to="/" className="btn btn-primary">
            متابعة التسوق
          </Link>
          <Link to="/" className="btn btn-ghost">
            الرئيسية
          </Link>
        </div>
      </div>
    </div>
  )
}
