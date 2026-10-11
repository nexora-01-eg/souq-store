import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { BRAND } from '../../../shared/brand'
import { LogoMark } from '../../components/Logo'
import { useAuth } from '../../state/auth'

const NAV = [
  { to: '/admin', label: 'نظرة عامة', icon: '📊', end: true },
  { to: '/admin/products', label: 'المنتجات والمخزون', icon: '📦', end: false },
  { to: '/admin/orders', label: 'الطلبات', icon: '🧾', end: false },
]

function Spinner() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
    </div>
  )
}

export default function AdminLayout() {
  const { user, loading, logout } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner />
  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  }
  if (user.role !== 'admin') {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <span className="text-6xl">🚫</span>
          <h1 className="mt-4 text-2xl font-bold">لا تملك صلاحية الدخول</h1>
          <p className="mt-2 text-slate-500">هذا القسم مخصص لمدير المتجر فقط.</p>
          <NavLink to="/" className="btn btn-primary mt-5">
            العودة للمتجر
          </NavLink>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      {/* #86 — branded backdrop for the whole admin surface */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-70"
        style={{ background: 'var(--page-bg-image)', backgroundColor: 'var(--page-bg)' }}
      />
      <div className="flex min-h-screen flex-col gap-4 p-3 md:flex-row md:p-4">
        <aside className="glass-dark sticky top-4 h-fit rounded-3xl text-slate-200 md:w-64 md:shrink-0">
        <div className="flex flex-wrap items-center gap-3 p-4 md:flex-col md:items-stretch md:gap-5">
          <div className="flex items-center gap-2.5 font-extrabold text-white">
            <LogoMark size={36} radius={12} />
            <span className="flex flex-col leading-none">
              <span className="font-display text-lg">{BRAND.name}</span>
              <span className="latin mt-1 text-[9px] font-bold text-slate-400">{BRAND.latin} ADMIN</span>
            </span>
          </div>

          <nav className="flex flex-1 flex-wrap gap-2 md:flex-col">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/40'
                      : 'text-slate-300 hover:bg-white/10'
                  }`
                }
              >
                <span>{n.icon}</span>
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:flex-col md:items-stretch">
            <span className="hidden truncate text-xs text-slate-400 md:block" dir="ltr">
              {user.email}
            </span>
            <NavLink
              to="/"
              className="rounded-2xl px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
            >
              ↩ عودة للمتجر
            </NavLink>
            <button
              className="rounded-2xl px-3 py-2 text-start text-sm font-semibold text-rose-300 transition hover:bg-white/10"
              onClick={() => void logout()}
            >
              تسجيل خروج
            </button>
          </div>
        </div>
      </aside>

        <main className="fade-in flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
