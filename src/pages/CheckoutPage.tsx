import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api'
import { BRAND } from '../../shared/brand'
import Breadcrumbs from '../components/Breadcrumbs'
import EmptyState from '../components/EmptyState'
import Price from '../components/Price'
import type { Order } from '../lib/types'
import {
  cvcValid,
  expiryValid,
  formatCardInput,
  formatExpiryInput,
  luhnValid,
  phoneValid,
} from '../lib/validate'
import { useAuth } from '../state/auth'
import { useCart } from '../state/cart'

interface FieldErrors {
  name?: string
  phone?: string
  address?: string
  card?: string
  exp?: string
  cvc?: string
}

/* #71 #72 — glassy three-step tracker. */
function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps: [1 | 2 | 3, string, string][] = [
    [1, 'بيانات التوصيل', 'الاسم والعنوان'],
    [2, 'الدفع', 'بطاقة تجريبية'],
    [3, 'التأكيد', 'تتبع طلبك'],
  ]
  return (
    <ol className="mt-5 flex items-center gap-2 sm:gap-4" aria-label="خطوات إتمام الشراء">
      {steps.map(([n, title, sub], i) => {
        const done = n < current
        const active = n === current
        return (
          <li key={n} className="flex flex-1 items-center gap-2 sm:gap-3">
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-sm font-extrabold transition sm:h-11 sm:w-11 ${
                active || done ? 'text-white shadow-lg' : 'bg-white/60 text-slate-400 ring-1 ring-white/70 backdrop-blur'
              }`}
              style={active || done ? { backgroundImage: 'var(--atlas-grad)', boxShadow: '0 10px 24px -12px rgba(121,70,229,.85)' } : undefined}
              aria-current={active ? 'step' : undefined}
            >
              {done ? '✓' : n}
            </span>
            <span className="hidden min-w-0 flex-col leading-tight sm:flex">
              <span className={`truncate text-sm font-bold ${active ? 'text-slate-900' : 'text-slate-500'}`}>{title}</span>
              <span className="truncate text-[11px] text-slate-400">{sub}</span>
            </span>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-gradient-to-l from-indigo-300/70 to-transparent" />}
          </li>
        )
      })}
    </ol>
  )
}

/* #76 — demo coupon codes with instant visual feedback. */
const COUPONS: Record<string, { pct: number; label: string }> = {
  ATLAS10: { pct: 10, label: 'خصم أطلس' },
  WELCOME5: { pct: 5, label: 'ترحيب' },
  VIP15: { pct: 15, label: 'VIP' },
}

export default function CheckoutPage() {
  const { items, totalCents, clear } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [card, setCard] = useState('')
  const [exp, setExp] = useState('')
  const [cvc, setCvc] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState<{ code: string; pct: number } | null>(null)
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function validate(): FieldErrors {
    const e: FieldErrors = {}
    if (name.trim().length < 2) e.name = 'أدخل اسمًا صحيحًا (حرفان على الأقل)'
    if (!phoneValid(phone)) e.phone = 'رقم هاتف غير صالح — مثال: 01001234567'
    if (address.trim().length < 5) e.address = 'أدخل عنوانًا مفصلاً (5 أحرف على الأقل)'
    if (!luhnValid(card)) e.card = 'رقم البطاقة غير صالح — للتجربة: 4242 4242 4242 4242'
    if (!expiryValid(exp)) e.exp = 'التاريخ غير صالح بصيغة MM/YY ويجب أن يكون مستقبليًا'
    if (!cvcValid(cvc)) e.cvc = 'رمز الأمان 3 أو 4 أرقام'
    return e
  }

  /* #71 — the tracker advances as soon as the delivery block is complete. */
  const deliveryDone = name.trim().length >= 2 && phoneValid(phone) && address.trim().length >= 5
  const step: 1 | 2 | 3 = deliveryDone ? 2 : 1

  function applyCoupon(e: FormEvent) {
    e.preventDefault()
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    const hit = COUPONS[code]
    if (hit) {
      setCoupon({ code, pct: hit.pct })
      setCouponMsg({ ok: true, text: `تم تطبيق «${hit.label}» — خصم ${hit.pct}%` })
    } else {
      setCoupon(null)
      setCouponMsg({ ok: false, text: 'كود غير صالح — جرّب ATLAS10' })
    }
  }

  const discount = coupon ? Math.round((totalCents * coupon.pct) / 100) : 0
  const payable = totalCents - discount

  async function submit(e: FormEvent) {
    e.preventDefault()
    setServerError(null)
    const clientErrors = validate()
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return

    setBusy(true)
    try {
      const order = await api<Order>('/api/orders', {
        method: 'POST',
        body: {
          items: items.map((i) => ({ productId: i.id, qty: i.qty })),
          customer: { name: name.trim(), phone: phone.trim(), address: address.trim() },
          payment: { number: card, exp, cvc },
        },
      })
      sessionStorage.setItem(`souq-order-${order.id}`, JSON.stringify(order))
      if (coupon) {
        sessionStorage.setItem('atlas-coupon', JSON.stringify({ ...coupon, offCents: discount }))
      }
      clear()
      navigate(`/order/${order.id}`, { state: { order }, replace: true })
    } catch (err) {
      if (err instanceof ApiError) setServerError(err.message)
      else setServerError('تعذر إتمام الطلب — حاول مرة أخرى')
    } finally {
      setBusy(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="fade-in mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          title="لا يمكن إتمام الطلب"
          text="سلتك فارغة — أضف منتجات أولاً ثم عد لإتمام الشراء."
          actionLabel="تصفح المنتجات"
          actionTo="/"
        />
      </div>
    )
  }

  return (
    <div className="fade-in mx-auto max-w-6xl px-4 py-8">
      <Breadcrumbs items={[{ label: 'السلة', to: '/cart' }, { label: 'إتمام الشراء' }]} />
      <h1 className="display mt-3 text-2xl md:text-3xl">إتمام الشراء</h1>
      <Steps current={step} />

      {serverError && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {serverError}
        </div>
      )}

      <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-3" noValidate>
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6">
            <h2 className="display mb-4 flex items-center gap-2.5 text-lg">
              <span
                className="grid h-8 w-8 place-items-center rounded-full font-display text-sm text-white shadow-md"
                style={{ backgroundImage: 'var(--atlas-grad)' }}
              >
                1
              </span>
              بيانات التوصيل
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="co-name">الاسم الكامل</label>
                <input
                  id="co-name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أحمد سالم"
                />
                {errors.name && <div className="field-error">{errors.name}</div>}
              </div>
              <div>
                <label className="label" htmlFor="co-phone">رقم الهاتف</label>
                <input
                  id="co-phone"
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01001234567"
                  inputMode="tel"
                  dir="ltr"
                />
                {errors.phone && <div className="field-error">{errors.phone}</div>}
              </div>
              <div>
                <label className="label" htmlFor="co-address">العنوان بالتفصيل</label>
                <input
                  id="co-address"
                  className="input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="المحافظة - المنطقة - الشارع - رقم العمارة"
                />
                {errors.address && <div className="field-error">{errors.address}</div>}
              </div>
            </div>
            {deliveryDone && (
              <div className="pop mt-4 flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                ✓ بيانات التوصيل مكتملة
              </div>
            )}
          </section>

          <section className="card p-6">
            <h2 className="display mb-4 flex items-center gap-2.5 text-lg">
              <span
                className="grid h-8 w-8 place-items-center rounded-full font-display text-sm text-white shadow-md"
                style={{ backgroundImage: 'var(--atlas-grad)' }}
              >
                2
              </span>
              الدفع (محاكاة — لا يُخصم أي مبلغ)
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="co-card">رقم البطاقة</label>
                <input
                  id="co-card"
                  className="input"
                  style={{ direction: 'ltr', textAlign: 'left' }}
                  value={card}
                  onChange={(e) => setCard(formatCardInput(e.target.value))}
                  placeholder="4242 4242 4242 4242"
                  inputMode="numeric"
                  autoComplete="off"
                />
                {errors.card && <div className="field-error">{errors.card}</div>}
              </div>
              <div>
                <label className="label" htmlFor="co-exp">تاريخ الانتهاء</label>
                <input
                  id="co-exp"
                  className="input"
                  style={{ direction: 'ltr', textAlign: 'left' }}
                  value={exp}
                  onChange={(e) => setExp(formatExpiryInput(e.target.value))}
                  placeholder="12/29"
                  inputMode="numeric"
                />
                {errors.exp && <div className="field-error">{errors.exp}</div>}
              </div>
              <div>
                <label className="label" htmlFor="co-cvc">رمز الأمان</label>
                <input
                  id="co-cvc"
                  className="input"
                  style={{ direction: 'ltr', textAlign: 'left' }}
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="123"
                  inputMode="numeric"
                />
                {errors.cvc && <div className="field-error">{errors.cvc}</div>}
              </div>
            </div>

            {/* #76 — coupon with instant feedback */}
            <div className="mt-5 border-t border-dashed border-slate-200 pt-5">
              <label className="label" htmlFor="co-coupon">كوبون خصم</label>
              <div className="flex gap-2">
                <input
                  id="co-coupon"
                  className="input uppercase"
                  style={{ direction: 'ltr', textAlign: 'left' }}
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="ATLAS10"
                />
                <button className="btn btn-ghost shrink-0" type="button" onClick={applyCoupon}>
                  تطبيق
                </button>
              </div>
              {couponMsg && (
                <div
                  key={couponMsg.text}
                  className={`pop mt-2 text-sm font-semibold ${couponMsg.ok ? 'text-emerald-600' : 'text-rose-600'}`}
                  role="status"
                >
                  {couponMsg.ok ? '✓ ' : '✕ '}
                  {couponMsg.text}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-white/60 bg-indigo-500/10 p-4 text-xs leading-6 text-indigo-900 backdrop-blur">
              <strong>بطاقات التجربة:</strong> أي رقم يجتاز فحص Luhn ينجح — مثل
              <code className="mx-1 rounded bg-white px-1.5 py-0.5" dir="ltr">4242 4242 4242 4242</code>.
              وأي رقم ينتهي بـ<code className="mx-1 rounded bg-white px-1.5 py-0.5" dir="ltr">0002</code> سيُرفض عمدًا
              لاختبار حالة الرفض.
            </div>
          </section>
        </div>

        <div className="card h-fit p-6">
          <span className="eyebrow">Order</span>
          <h2 className="display mt-1.5 text-lg">طلبك</h2>

          <ul className="mt-4 max-h-56 space-y-3 overflow-y-auto pe-1">
            {items.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="line-clamp-1 text-slate-600">
                  {i.emoji} {i.name} <span className="tnum text-slate-400">×{i.qty}</span>
                </span>
                <span className="tnum shrink-0 font-semibold">
                  {((i.qty * i.priceCents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
                </span>
              </li>
            ))}
          </ul>

          {/* #73 — dotted leaders */}
          <dl className="mt-5 space-y-3 border-t border-dashed border-slate-200 pt-4 text-sm">
            <div className="leader">
              <dt className="text-slate-500">المجموع الفرعي</dt>
              <dd className="tnum font-semibold text-slate-800">{(totalCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م</dd>
            </div>
            <div className="leader">
              <dt className="text-slate-500">الشحن</dt>
              <dd className="font-semibold text-emerald-600">مجاني</dd>
            </div>
            {discount > 0 && (
              <div className="leader">
                <dt className="font-semibold text-indigo-600">كوبون {coupon!.code}</dt>
                <dd className="tnum font-semibold text-indigo-600">−{(discount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م</dd>
              </div>
            )}
            <div className="leader border-t border-dashed border-slate-200 pt-3">
              <dt className="font-display text-base font-bold text-slate-900">الإجمالي</dt>
              <dd>
                <Price cents={payable} className="text-gradient text-xl" />
              </dd>
            </div>
          </dl>

          <button type="submit" className="btn btn-primary mt-5 w-full py-3" disabled={busy}>
            {busy ? 'جارٍ تنفيذ الدفع...' : `ادفع ${(payable / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`}
          </button>

          <Link to="/cart" className="btn btn-ghost mt-3 w-full">
            رجوع للسلة
          </Link>

          {/* #78 — trust strip */}
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              ['🔒', 'دفع آمن'],
              ['↩️', 'إرجاع 14 يوم'],
              ['🚚', 'شحن مجاني'],
            ].map(([icon, label]) => (
              <div key={label} className="rounded-2xl bg-white/40 py-2.5 backdrop-blur">
                <div className="text-lg">{icon}</div>
                <div className="text-[10px] font-bold text-slate-500">{label}</div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-center text-[11px] text-slate-400">
            بالطلب أنت توافق على سياسات {BRAND.name} — الدفع محاكى بالكامل.
          </p>
        </div>
      </form>
    </div>
  )
}
