import { useEffect, useState } from 'react'
import { api } from '../../api'
import BarChart from '../../components/BarChart'
import { formatEgp, formatInt } from '../../lib/money'
import type { Reports } from '../../lib/types'

const RANGE_OPTIONS = [
  { value: 7, label: 'آخر 7 أيام' },
  { value: 14, label: 'آخر 14 يوم' },
  { value: 30, label: 'آخر 30 يوم' },
]

function StatCard({ title, value, sub, icon, accent, trend, spark }: {
  title: string
  value: string
  sub?: string
  icon: string
  accent: string
  trend?: number | null
  /** #79 — miniature trend line under the number */
  spark?: number[]
}) {
  const path = spark && spark.length > 1 ? sparkPath(spark) : null

  return (
    <div className="card p-5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/10">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <span
          className="grid h-9 w-9 place-items-center rounded-xl backdrop-blur"
          style={{ background: `${accent}1f` }}
        >
          {icon}
        </span>
      </div>
      {/* #79 — big display number */}
      <div className="tnum display mt-2 text-[1.7rem] leading-tight">{value}</div>

      {path && (
        <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="mt-1 h-7 w-full" aria-hidden>
          <path
            d={`${path} L100,28 L0,28 Z`}
            fill={accent}
            opacity="0.12"
          />
          <path d={path} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}

      <div className="mt-1 flex items-end justify-between gap-2">
        {trend !== undefined && (
          <span
            className={`pill ${
              trend === null ? 'bg-slate-500/15 text-slate-500' : trend >= 0 ? 'pill-ok' : 'pill-bad'
            }`}
            title="مقارنة بالفترة السابقة"
          >
            {trend === null ? 'جديد' : `${trend >= 0 ? '▲' : '▼'} ${Math.abs(trend)}%`}
          </span>
        )}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  )
}

/** smooth polyline across the sparkline window */
function sparkPath(values: number[]): string {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100
      const y = 26 - ((v - min) / span) * 24
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export default function Dashboard() {
  const [reports, setReports] = useState<Reports | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(14)

  useEffect(() => {
    let cancelled = false
    setError(null)
    api<Reports>(`/api/admin/reports?days=${days}`)
      .then((r) => {
        if (!cancelled) setReports(r)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر تحميل التقارير')
      })
    return () => {
      cancelled = true
    }
  }, [days])

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
    )
  }

  if (!reports) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-3xl" />
        ))}
      </div>
    )
  }

  const { kpis, series, topProducts, lowStock } = reports

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">نظرة عامة</h1>
          <p className="mt-1 text-sm text-slate-500">أداء المتجر خلال {reports.days} يومًا الماضية</p>
        </div>
        <select className="input w-40" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {RANGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {kpis.lowStockCount > 0 && (
        <div className="rounded-2xl border border-amber-200/60 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-800 backdrop-blur">
          ⚠️ {kpis.lowStockCount} منتجات على وشك النفاد (8 قطع أو أقل) — راجع قسم المخزون.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="الإيرادات" value={formatEgp(kpis.revenueCents)} sub="طلبات مدفوعة ومشحونة" icon="💰" accent="#059669" trend={reports.trends.revenuePct} spark={series.map((s) => s.revenueCents)} />
        <StatCard title="طلبات مدفوعة" value={formatInt(kpis.paidOrders)} sub={`من إجمالي ${formatInt(kpis.allOrders)} طلب`} icon="🧾" accent="#7946e5" trend={reports.trends.ordersPct} spark={series.map((s) => s.orders)} />
        <StatCard title="قطع مباعة" value={formatInt(kpis.unitsSold)} sub="وحدة خلال الفترة" icon="📦" accent="#d97706" spark={series.map((s) => s.orders)} />
        <StatCard title="متوسط الطلب" value={formatEgp(kpis.avgOrderCents)} sub="متوسط قيمة الطلب" icon="📈" accent="#db2777" spark={series.map((s) => s.revenueCents)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">الإيرادات اليومية</h2>
            <span className="badge">مقارنة بالفترة السابقة: {reports.trends.revenuePct === null ? 'جديد' : `${reports.trends.revenuePct >= 0 ? '▲' : '▼'} ${Math.abs(reports.trends.revenuePct)}%`}</span>
          </div>
          <BarChart
            bars={series.map((s) => ({
              label: s.day,
              value: s.revenueCents,
              hint: `${s.day}: ${formatEgp(s.revenueCents)} — ${s.orders} طلب`,
            }))}
          />
        </div>

        <div className="card p-6">
          <h2 className="mb-4 font-bold text-slate-900">مخزون منخفض ⚠️</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-slate-500">كل المنتجات بمخزون آمن ✅</p>
          ) : (
            <ul className="space-y-3">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="line-clamp-1 text-slate-600">
                    {p.emoji} {p.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      p.stock <= 3 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {p.stock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <span className="eyebrow">Top sellers</span>
          <h2 className="mt-1.5 font-bold text-slate-900">أفضل المنتجات مبيعًا</h2>
        </div>
        {topProducts.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">لا مبيعات بعد في هذه الفترة.</p>
        ) : (
          <table className="w-full">
            <thead className="bg-white/40 backdrop-blur">
              <tr>
                <th className="table-th">#</th>
                <th className="table-th">المنتج</th>
                <th className="table-th">القطع المباعة</th>
                <th className="table-th">الإيراد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topProducts.map((p, i) => (
                <tr key={p.name} className="transition odd:bg-white/25 hover:bg-indigo-500/10">
                  <td className="table-td text-slate-400">{i + 1}</td>
                  <td className="table-td font-semibold text-slate-800">
                    {p.emoji} {p.name}
                  </td>
                  <td className="table-td">{formatInt(p.qty)}</td>
                  <td className="table-td font-bold text-emerald-700">{formatEgp(p.revenueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
