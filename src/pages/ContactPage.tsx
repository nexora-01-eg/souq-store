import { useState, type FormEvent } from 'react'
import { BRAND } from '../../shared/brand'
import Breadcrumbs from '../components/Breadcrumbs'
import Reveal from '../components/Reveal'

const CHANNELS = [
  { icon: '📞', title: 'الخط الموحد', value: BRAND.hotline, sub: 'من 9ص حتى 10م', href: `tel:${BRAND.hotline}` },
  { icon: '✉️', title: 'البريد الإلكتروني', value: BRAND.email, sub: 'الرد خلال 24 ساعة', href: `mailto:${BRAND.email}` },
  { icon: '📍', title: 'المقر الرئيسي', value: BRAND.address, sub: 'زيارة بموعد مسبق' },
  { icon: '🕐', title: 'مواعيد العمل', value: BRAND.hours, sub: 'باستثناء العطل الرسمية' },
]

const FAQ: [string, string][] = [
  ['هل الشحن مجاني؟', 'نعم — شحن مجاني على كل الطلبات لكل محافظات مصر.'],
  ['كام يوم يستلم الطلب؟', 'من 2 لـ 4 أيام عمل، وتأكيد الطلب بيوصل على تليفونك فورًا.'],
  ['أقدر أرجع المنتج؟', 'أيوه — إرجاع مجاني خلال 14 يوم من الاستلام.'],
  ['الدفع حقيقي ولا تجريبي؟', 'الموقع تجريبي بالكامل — مفيش أي خصم فعلي لبطاقات.'],
]

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (name.trim().length < 2) return setError('اكتب اسمك من فضلك')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError('البريد الإلكتروني غير صالح')
    if (message.trim().length < 10) return setError('اكتب رسالة من 10 أحرف على الأقل')

    const subject = encodeURIComponent(`رسالة من ${name.trim()} — موقع ${BRAND.name}`)
    const body = encodeURIComponent(`${message.trim()}\n\n—\n${name.trim()}\n${email.trim()}`)
    window.location.href = `mailto:${BRAND.email}?subject=${subject}&body=${body}`
    setSent(true)
  }

  return (
    <div className="fade-in mx-auto max-w-5xl px-4 py-8">
      {/* #37 */}
      <Breadcrumbs items={[{ label: 'تواصل معنا' }]} />

      {/* #24 #25 #4 — branded header band */}
      <header className="relative mt-3 overflow-hidden rounded-[2rem] text-white">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,#472e81 0%,#4c1d95 45%,#831843 100%)' }} />
        <div className="absolute inset-0 opacity-90" style={{ background: 'var(--atlas-aurora)' }} />
        <span
          aria-hidden
          className="watermark pointer-events-none absolute -bottom-5 left-6 text-[6rem] leading-none"
          style={{ WebkitTextStrokeColor: 'rgba(255,255,255,.18)' }}
        >
          {BRAND.latin}
        </span>
        <div className="relative px-6 py-10 text-center sm:px-10">
          <span className="eyebrow justify-center" style={{ color: 'rgba(255,255,255,.8)' }}>
            Talk to us
          </span>
          <h1 className="display mt-3 text-3xl text-white md:text-4xl">تواصل معنا</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-indigo-100">
            فريق {BRAND.name} جاهز يساعدك — اختار القناة اللي تناسبك، وهردّ عليك في أقرب وقت.
          </p>
        </div>
      </header>

      {/* #87 — staggered channel cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CHANNELS.map((c, i) => {
          const inner = (
            <>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 text-2xl backdrop-blur">
                {c.icon}
              </span>
              <div className="mt-3 text-sm font-bold text-slate-900">{c.title}</div>
              <div className="mt-1 text-sm leading-6 text-slate-600">{c.value}</div>
              <div className="mt-1 text-xs text-slate-400">{c.sub}</div>
            </>
          )
          return (
            <Reveal key={c.title} delay={i * 80}>
              {c.href ? (
                <a href={c.href} className="card block h-full p-5 transition hover:-translate-y-1 hover:shadow-lg">
                  {inner}
                </a>
              ) : (
                <div className="card h-full p-5">{inner}</div>
              )}
            </Reveal>
          )
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Reveal className="card p-7">
          <span className="eyebrow">Message</span>
          <h2 className="display mt-1.5 text-lg">ابعتلنا رسالة</h2>
          {sent ? (
            <div className="mt-5 rounded-2xl border border-emerald-200/60 bg-emerald-500/10 p-5 text-sm leading-6 text-emerald-800 backdrop-blur">
              ✅ فتحنا لك تطبيق البريد برسالتك جاهزة. لو ما اتفتحش، ابعتلنا مباشرة على{' '}
              <a href={`mailto:${BRAND.email}`} className="font-bold underline" dir="ltr">
                {BRAND.email}
              </a>
              .
            </div>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
              {error && (
                <div className="rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700 backdrop-blur">
                  {error}
                </div>
              )}
              <div>
                <label className="label" htmlFor="ct-name">الاسم</label>
                <input id="ct-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك الكامل" />
              </div>
              <div>
                <label className="label" htmlFor="ct-email">البريد الإلكتروني</label>
                <input
                  id="ct-email"
                  className="input"
                  type="email"
                  dir="ltr"
                  style={{ textAlign: 'left' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="label" htmlFor="ct-msg">رسالتك</label>
                <textarea
                  id="ct-msg"
                  className="input min-h-32"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="اكتب استفسارك أو ملاحظتك هنا..."
                />
              </div>
              <button className="btn btn-primary w-full py-3">إرسال الرسالة</button>
            </form>
          )}
        </Reveal>

        <Reveal delay={90} className="card overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 p-6 backdrop-blur">
            <span className="eyebrow">FAQ</span>
            <h2 className="display mt-1.5 text-lg">أسئلة سريعة</h2>
          </div>
          <ul className="divide-y divide-white/60 px-6">
            {FAQ.map(([q, a], i) => (
              <li key={q} className="flex gap-3 py-4">
                {/* #30 — numbered items */}
                <span className="tnum mt-0.5 text-xs font-extrabold text-indigo-500">{`#0${i + 1}`}</span>
                <div>
                  <div className="text-sm font-bold text-slate-900">{q}</div>
                  <div className="mt-1 text-sm text-slate-500">{a}</div>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </div>
  )
}
