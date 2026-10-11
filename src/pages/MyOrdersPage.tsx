import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api'
import Breadcrumbs from '../components/Breadcrumbs'
import EmptyState from '../components/EmptyState'
import { formatEgp, formatInt } from '../lib/money'
import { STATUS_LABELS, type Order } from '../lib/types'
import { useAuth } from '../state/auth'

const STATUS_STYLES = {
  paid: 'pill-ok',
  shipped: 'pill-info',
  cancelled: 'pill-bad',
} as const

export default function MyOrdersPage() {
  const { user, loading } = useAuth()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)

  useEffect(() => {
    if (loading || !user) return
    let cancelled = false
    api<{ items: Order[] }>('/api/my/orders')
      .then((d) => {
        if (!cancelled) setOrders(d.items)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر تحميل الطلبات')
      })
    return () => {
      cancelled = true
    }
  }, [loading, user])

  if (loading) {
    return (
      <div className="mx-auto grid max-w-3xl place-items-center gap-4 px-4 py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login?next=/orders" replace />

  const totalSpent = (orders ?? []).filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.totalCents, 0)

  return (
    <div className="fade-in mx-auto max-w-4xl px-4 py-8">
      <Breadcrumbs items={[{ label: 'طلباتي' }]} />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">My orders</span>
          <h1 className="display mt-1.5 text-2xl md:text-3xl">طلباتي</h1>
          <p className="mt-1 text-sm text-slate-500">كل الطلبات المرتبطة بحسابك في مكان واحد</p>
        </div>
        {orders && orders.length > 0 && (
          <div className="glass rounded-2xl px-4 py-2 text-sm">
            <span className="text-slate-500">إجمالي المشتريات: </span>
            <span className="text-gradient font-extrabold">{formatEgp(totalSpent)}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700 backdrop-blur">
          {error}
        </div>
      )}

      {!orders ? (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-3xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="لسه مفيش طلبات"
            text="أول طلب ليك هيظهر هنا مع حالته وتفاصيله وكمان تقدر تتبعه لحظة بلحظة."
            actionLabel="ابدأ التسوق"
            actionTo="/"
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 font-mono text-sm font-extrabold text-indigo-700 backdrop-blur">
                    #{o.id}
                  </span>
                  <div>
                    <div className="text-sm text-slate-500">{o.createdAt}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`pill ${STATUS_STYLES[o.status]}`}>
                        {STATUS_LABELS[o.status]}
                      </span>
                      <span className="text-xs text-slate-400">{formatInt(o.items.length)} أصناف</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gradient font-extrabold">{formatEgp(o.totalCents)}</span>
                  <button
                    className="btn btn-ghost px-3 py-1.5 text-xs"
                    onClick={() => setOpenId(openId === o.id ? null : o.id)}
                  >
                    {openId === o.id ? 'إخفاء التفاصيل ▲' : 'التفاصيل ▼'}
                  </button>
                </div>
              </div>

              {openId === o.id && (
                <div className="border-t border-white/60 bg-white/40 px-5 py-4 backdrop-blur">
                  <div className="mb-3 text-xs text-slate-500">
                    التوصيل إلى: <strong>{o.address}</strong> — {o.phone}
                  </div>
                  <ul className="divide-y divide-white/60">
                    {o.items.map((it) => (
                      <li key={it.productId} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-slate-600">
                          {it.name} <span className="text-slate-400">×{it.qty}</span>
                        </span>
                        <span className="font-semibold">{formatEgp(it.priceCents * it.qty)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
