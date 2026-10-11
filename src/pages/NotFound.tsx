import { Link } from 'react-router-dom'
import { BRAND } from '../../shared/brand'
import { LogoStacked } from '../components/Logo'

const SUGGESTIONS: { to: string; label: string; sub: string }[] = [
  { to: '/', label: 'الصفحة الرئيسية', sub: `${BRAND.latin} — أكتر من 1200 منتج` },
  { to: '/orders', label: 'طلباتي', sub: 'تابع طلباتك وحالاتها' },
  { to: '/contact', label: 'تواصل معنا', sub: 'الخط الموحد والبريد والأسئلة الشائعة' },
]

/** #58 #99 — a branded, helpful 404 instead of a dead end. */
export default function NotFound() {
  return (
    <div className="fade-in mx-auto grid max-w-3xl place-items-center gap-5 px-4 py-16 text-center">
      <div className="relative">
        <span
          aria-hidden
          className="watermark pointer-events-none absolute inset-0 -z-10 grid place-items-center text-[9rem] leading-none"
        >
          404
        </span>
        <LogoStacked markSize={72} />
      </div>

      <div>
        <span className="eyebrow justify-center">Lost in the atlas</span>
        <h1 className="display mt-2 text-3xl">الصفحة غير موجودة</h1>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          الرابط اللي طلبته غلط أو اتحذف. متشيلش هم — رجّعناك لأهم الصفحات تحت.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn btn-primary">
          العودة إلى المتجر
        </Link>
        <Link to="/cart" className="btn btn-ghost">
          سلة التسوق
        </Link>
      </div>

      <div className="grid w-full gap-3 sm:grid-cols-3">
        {SUGGESTIONS.map((s) => (
          <Link key={s.to} to={s.to} className="card p-4 text-start transition hover:-translate-y-1 hover:shadow-lg">
            <div className="text-sm font-bold text-slate-900">{s.label}</div>
            <div className="mt-1 text-xs leading-5 text-slate-400">{s.sub}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
