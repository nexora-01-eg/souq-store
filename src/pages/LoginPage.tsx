import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BRAND } from '../../shared/brand'
import { LogoHorizontal, LogoSeal } from '../components/Logo'
import { useAuth } from '../state/auth'

const DEMO_ACCOUNTS = [
  { label: 'مدير المتجر', email: 'admin@demo.local', password: 'admin1234' },
  { label: 'عميل تجريبي', email: 'customer@demo.local', password: 'customer1234' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const next = new URLSearchParams(location.search).get('next') || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(email.trim(), password)
      navigate(next, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fade-in mx-auto grid max-w-5xl items-center gap-8 px-4 py-12 md:grid-cols-2">
      {/* #86 — branded gradient panel */}
      <aside className="relative hidden overflow-hidden rounded-[2.5rem] p-9 text-white md:block">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,#472e81 0%,#4c1d95 45%,#831843 100%)' }} />
        <div className="absolute inset-0 opacity-90" style={{ background: 'var(--atlas-aurora)' }} />
        <span
          aria-hidden
          className="watermark pointer-events-none absolute -bottom-6 -left-4 text-[7rem] leading-none"
          style={{ WebkitTextStrokeColor: 'rgba(255,255,255,.18)' }}
        >
          {BRAND.latin}
        </span>

        <div className="relative">
          <LogoHorizontal markSize={46} />
          <h2 className="display mt-7 text-2xl leading-snug text-white">
            اهلاً بيك تاني في {BRAND.name}
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-7 text-indigo-100">
            ادخل حسابك عشان تتابع طلباتك، أو استخدم حسابات الجاهزة تحت لو عاوز تشوف لوحة الإدارة على طول.
          </p>

          <ul className="mt-6 space-y-3 text-sm">
            {[
              ['🚚', 'شحن مجاني لكل الطلبات'],
              ['↩️', 'إرجاع خلال 14 يوم'],
              ['🛡️', 'ضمان يصل إلى 12 شهر'],
            ].map(([icon, text]) => (
              <li key={text} className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-lg">{icon}</span>
                {text}
              </li>
            ))}
          </ul>

          <LogoSeal size={96} className="mt-8 text-white/85" />
        </div>
      </aside>

      <div className="glass-strong w-full rounded-3xl p-7">
        <div className="mb-5 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-2xl text-white shadow-lg shadow-indigo-500/40">
            👋
          </span>
          <h1 className="display mt-3 text-2xl">تسجيل الدخول</h1>
          <p className="mt-1 text-sm text-slate-500">أهلاً بعودتك إلى {BRAND.name}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="lg-email">البريد الإلكتروني</label>
            <input
              id="lg-email"
              className="input"
              type="email"
              dir="ltr"
              style={{ textAlign: 'left' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label" htmlFor="lg-pass">كلمة المرور</label>
            <input
              id="lg-pass"
              className="input"
              type="password"
              dir="ltr"
              style={{ textAlign: 'left' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <button className="btn btn-primary w-full py-3" disabled={busy}>
            {busy ? 'جارٍ الدخول...' : 'دخول'}
          </button>
        </form>

        <div className="glass mt-5 rounded-2xl p-4">
          <div className="mb-2 text-xs font-bold text-slate-500">حسابات جاهزة للتجربة:</div>
          <div className="flex flex-col gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                className="btn btn-ghost justify-between text-xs"
                onClick={() => {
                  setEmail(acc.email)
                  setPassword(acc.password)
                }}
              >
                <span>{acc.label}</span>
                <code dir="ltr">{acc.email}</code>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          ليس لديك حساب؟{' '}
          <Link to="/register" className="font-semibold text-indigo-600 hover:underline">
            أنشئ حسابًا جديدًا
          </Link>
        </p>
      </div>
    </div>
  )
}
