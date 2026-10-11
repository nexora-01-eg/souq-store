import { Fragment, useEffect, useState } from 'react'
import { api, ApiError } from '../../api'
import { formatEgp, formatInt } from '../../lib/money'
import { STATUS_LABELS, type AdminOrder, type OrderStatus } from '../../lib/types'

const STATUS_STYLES: Record<OrderStatus, string> = {
  paid: 'pill-ok',
  shipped: 'pill-info',
  cancelled: 'pill-bad',
}

const FILTERS: { value: '' | OrderStatus; label: string }[] = [
  { value: '', label: 'كل الطلبات' },
  { value: 'paid', label: 'مدفوع' },
  { value: 'shipped', label: 'تم الشحن' },
  { value: 'cancelled', label: 'ملغي' },
]

export default function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [filter, setFilter] = useState<'' | OrderStatus>('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    try {
      const qs = filter ? `?status=${filter}` : ''
      const d = await api<{ items: AdminOrder[] }>(`/api/admin/orders${qs}`)
      setOrders(d.items)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل الطلبات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  async function changeStatus(order: AdminOrder, status: OrderStatus) {
    try {
      await api(`/api/admin/orders/${order.id}/status`, { method: 'PATCH', body: { status } })
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)))
      setNotice(
        status === 'cancelled'
          ? `تم إلغاء الطلب #${order.id} وإعادة المنتجات للمخزون`
          : `تم تحديث الطلب #${order.id} إلى «${STATUS_LABELS[status]}»`,
      )
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'تعذر تحديث الحالة')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-2xl">الطلبات</h1>
          <p className="mt-1 text-sm text-slate-500">{formatInt(orders.length)} طلب معروض</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                filter === f.value
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200/60 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 backdrop-blur">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="إغلاق">✕</button>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700 backdrop-blur">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="إغلاق">✕</button>
        </div>
      )}

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-2xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="glass grid place-items-center gap-3 rounded-3xl p-12 text-center">
            <span className="text-5xl">🧾</span>
            <h2 className="font-bold">لا توجد طلبات</h2>
            <p className="text-sm text-slate-500">لا طلبات مطابقة لهذا التصنيف بعد.</p>
          </div>
        ) : (
          <table className="w-full min-w-[760px]">
            <thead className="rounded-t-2xl border-b border-slate-200/60 bg-white/50 backdrop-blur">
              <tr>
                <th className="table-th">#</th>
                <th className="table-th">التاريخ</th>
                <th className="table-th">العميل</th>
                <th className="table-th">الأصناف</th>
                <th className="table-th">الإجمالي</th>
                <th className="table-th">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <Fragment key={o.id}>
                  <tr className="transition odd:bg-white/25 hover:bg-indigo-500/10">
                    <td className="table-td font-mono font-bold text-slate-700">#{o.id}</td>
                    <td className="table-td text-slate-500">
                      <div>{o.createdAt.slice(0, 10)}</div>
                      <div className="text-xs text-slate-400">{o.createdAt.slice(11, 16)}</div>
                    </td>
                    <td className="table-td">
                      <div className="font-semibold text-slate-800">{o.customerName}</div>
                      <div className="text-xs text-slate-400" dir="ltr">
                        {o.userEmail ?? o.phone}
                      </div>
                    </td>
                    <td className="table-td">
                      <button
                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                        onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                      >
                        {o.items.length} صنف {expandedId === o.id ? '▲' : '▼'}
                      </button>
                    </td>
                    <td className="table-td font-bold text-slate-900">{formatEgp(o.totalCents)}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <span className={`pill ${STATUS_STYLES[o.status]}`}>
                          {STATUS_LABELS[o.status]}
                        </span>
                        <select
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          value={o.status}
                          onChange={(e) => void changeStatus(o, e.target.value as OrderStatus)}
                          aria-label={`حالة الطلب ${o.id}`}
                        >
                          <option value="paid">مدفوع</option>
                          <option value="shipped">تم الشحن</option>
                          <option value="cancelled">ملغي</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                  {expandedId === o.id && (
                    <tr className="bg-white/50 backdrop-blur">
                      <td colSpan={6} className="table-td">
                        <div className="rounded-xl bg-white p-4">
                          <div className="mb-3 grid gap-3 text-xs text-slate-500 sm:grid-cols-3">
                            <div>
                              <strong>الهاتف:</strong>{' '}
                              <span dir="ltr">{o.phone}</span>
                            </div>
                            <div className="sm:col-span-2">
                              <strong>العنوان:</strong> {o.address}
                            </div>
                          </div>
                          <ul className="divide-y divide-slate-100">
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
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
