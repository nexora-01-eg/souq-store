import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BRAND } from '../../shared/brand'
import { LogoHorizontal, LogoSeal } from '../components/Logo'
import { useAuth } from '../state/auth'

const PERKS = [
  ['🧾', 'تتبع طلباتك لحظة بلحظة'],
  ['↩️', 'إرجاع مجاني خلال 14 يوم'],
  ['⚡', 'أولوية في عروض أطلس'],
]

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (name.trim().length < 2) return setError('أدخل اسمًا صحيحًا (حرفان على الأقل)')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError('البريد الإلكتروني غير صالح')
    if (password.length < 6) return setError('كلمة المرور 6 أحرف على الأقل')
    if (password !== confirm) return setError('كلمتا المرور غير متطابقتين')

    setBusy(true)
    try {
      await register(name.trim(), email.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إنشاء الحساب')
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
          className="watermark pointer-events-none absolute -bottom-6 -right-4 text-[7rem] leading-none"
          style={{ WebkitTextStrokeColor: 'rgba(255,255,255,.18)' }}
        >
          {BRAND.latin}
        </span>

        <div className="relative">
          <LogoHorizontal markSize={46} />
          <h2 className="display mt-7 text-2xl leading-snug text-white">
            افتح حسابك في {BRAND.name} في أقل من دقيقة
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-7 text-indigo-100">
            سجّل بياناتك بس، ومفيش حاجة اسمها بطاقة دفع دلوقتي — ده متجر تجريبي بالكامل.
          </p>

          <ul className="mt-6 space-y-3 text-sm">
            {PERKS.map(([icon, text]) => (
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
            ✨
          </span>
          <h1 className="display mt-3 text-2xl">إنشاء حساب جديد</h1>
          <p className="mt-1 text-sm text-slate-500">سجّل بياناتك وابدأ التسوق فورًا</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200/60 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700 backdrop-blur">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="rg-name">الاسم</label>
            <input
              id="rg-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسمك الكامل"
              autoComplete="name"
            />
          </div>
          <div>
            <label className="label" htmlFor="rg-email">البريد الإلكتروني</label>
            <input
              id="rg-email"
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
            <label className="label" htmlFor="rg-pass">كلمة المرور</label>
            <input
              id="rg-pass"
              className="input"
              type="password"
              dir="ltr"
              style={{ textAlign: 'left' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6 أحرف على الأقل"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label" htmlFor="rg-confirm">تأكيد كلمة المرور</label>
            <input
              id="rg-confirm"
              className="input"
              type="password"
              dir="ltr"
              style={{ textAlign: 'left' }}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="أعد كتابة كلمة المرور"
              autoComplete="new-password"
            />
          </div>
          <button className="btn btn-primary w-full py-3" disabled={busy}>
            {busy ? 'جارٍ الإنشاء...' : 'إنشاء الحساب'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          لديك حساب بالفعل؟{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
            سجّل دخولك
          </Link>
        </p>
      </div>
    </div>
  )
}
