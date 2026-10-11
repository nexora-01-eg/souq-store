import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { BRAND } from '../../shared/brand'
import { LogoMark, LogoSeal } from '../components/Logo'
import Reveal from '../components/Reveal'
import { formatInt } from '../lib/money'
import type { ProductsResponse } from '../lib/types'

const VALUES = [
  {
    icon: '🛡️',
    title: 'جودة موثوقة',
    text: 'كل منتج من أطلس يمر بمختبرنا الداخلي قبل ما يوصل لرفوف المستودع.',
  },
  {
    icon: '⚖️',
    title: 'سعر عادل',
    text: 'بيع مباشر من البراند للعميل — من غير وسيط يضخّم السعر.',
  },
  {
    icon: '🇪🇬',
    title: 'خدمة محلية',
    text: 'فريق مصري يرد عليك على الخط الموحد ويشتغل طول أيام الأسبوع.',
  },
]

const MILESTONES = [
  { year: String(BRAND.since), title: 'البداية', text: 'ورشة صغيرة في القاهرة بأقل من 20 منتجًا مصنوعًا بعناية.' },
  { year: String(BRAND.since + 3), title: 'أول مستودع', text: 'افتتاح مستودع التجمع الخامس وتوصيل لكل محافظات مصر.' },
  { year: String(BRAND.since + 6), title: '1000 منتج', text: 'تجاوزت التشكيلة 1000 منتج في 8 فئات بمعايير عالمية.' },
  { year: '2026', title: 'أطلس أونلاين', text: 'إطلاق متجر أطلس الرسمي بواجهة زجاجية ودفع إلكتروني آمن.' },
]

export default function AboutPage() {
  const [total, setTotal] = useState<number | null>(null)
  const [categories, setCategories] = useState<number | null>(null)

  useEffect(() => {
    api<ProductsResponse>('/api/products?perPage=1')
      .then((d) => {
        setTotal(d.total)
        setCategories(d.categories.length)
      })
      .catch(() => {
        setTotal(null)
      })
  }, [])

  const stats = [
    { value: total === null ? '…' : `${formatInt(total)}+`, label: 'منتج في الكتالوج' },
    { value: categories === null ? '…' : `${categories}+`, label: 'فئة رئيسية' },
    { value: '50K+', label: 'عميل سعيد' },
    { value: '14 يوم', label: 'إرجاع مجاني' },
  ]

  return (
    <div className="fade-in">
      <section className="relative overflow-hidden rounded-b-[2.75rem] text-white">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,#472e81 0%,#4c1d95 45%,#831843 100%)' }} />
        <div className="absolute inset-0 opacity-90" style={{ background: 'var(--atlas-aurora)' }} />
        {/* #4 — ghost monogram watermark */}
        <span
          aria-hidden
          className="watermark pointer-events-none absolute -bottom-8 right-6 text-[16vw] leading-none"
          style={{ WebkitTextStrokeColor: 'rgba(255,255,255,.16)' }}
        >
          {BRAND.latin}
        </span>
        <span aria-hidden className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/15 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center">
          <LogoMark size={76} radius={22} className="mx-auto drop-shadow-2xl" />
          <span className="eyebrow mt-5 justify-center" style={{ color: 'rgba(255,255,255,.8)' }}>
            Since {BRAND.since} — Cairo
          </span>
          <h1 className="display mt-3 text-4xl text-white md:text-5xl">
            {BRAND.name} <span className="latin text-2xl opacity-80">{BRAND.latin}</span>
          </h1>
          <p className="mt-3 text-lg text-indigo-50">{BRAND.tagline}</p>
          <p className="mt-1 text-sm text-indigo-100/80">
            {BRAND.legal} — منذ {BRAND.since}
          </p>
          {/* #6 — rotating seal */}
          <div className="mt-7 flex justify-center">
            <LogoSeal size={104} className="text-white/85" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-12 px-4 py-12">
        <section className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <Reveal key={s.label}>
              <div className="card p-6 text-center">
                {/* #30 — display numbers */}
                <div className="tnum display text-gradient text-4xl">{s.value}</div>
                <div className="mt-1.5 text-sm text-slate-500">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </section>

        <section className="card p-8">
          <span className="eyebrow">Our story</span>
          <h2 className="display mt-1.5 text-xl">قصتنا</h2>
          <div className="mt-4 space-y-4 leading-8 text-slate-600">
            <p>
              بدأت {BRAND.name} سنة {BRAND.since} من ورشة صغيرة في القاهرة، بفكرة بسيطة: إن المصري يستاهل
              منتجات أصلية بسعر من غير قهر — ولازم يكون فيه براند محلي يقدر يثق فيه.
            </p>
            <p>
              بعد سنين من الشغل على الجودة، بقى عندنا مستودع في التجمع الخامس، ومختبر داخلي لكل منتج، وخط
              موحد بيرد على عملاءنا طول الأسبوع. النهارьте التشكيلة عدّت <strong>1200 منتج</strong> في 8 فئات،
              وكلها بمعايير الاختبار الداخلية لـ{BRAND.name}.
            </p>
            <p>
              دلوقتي بنبيع مباشرة ليك — من المستودع لباب بيتك — بشحن مجاني وإرجاع خلال 14 يوم، من غير أي
              رسوم مخفية.
            </p>
          </div>
        </section>

        <section>
          <span className="eyebrow">Values</span>
          <h2 className="display mb-5 mt-1.5 text-xl">قيمنا</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 90}>
                <div className="card h-full p-6 transition hover:-translate-y-1">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 text-2xl backdrop-blur">
                  {v.icon}
                </span>
                <h3 className="mt-4 font-bold text-slate-900">{v.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-500">{v.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section>
          <span className="eyebrow">Timeline</span>
          <h2 className="display mb-5 mt-1.5 text-xl">محطاتنا</h2>
          <div className="card p-6">
            <ol className="relative space-y-6 border-s-2 border-indigo-200 ps-6">
              {MILESTONES.map((m) => (
                <li key={m.year} className="relative">
                  <span className="absolute -start-[31px] grid h-4 w-4 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 ring-4 ring-indigo-100" />
                  <div className="text-xs font-bold text-indigo-600">{m.year}</div>
                  <div className="font-bold text-slate-900">{m.title}</div>
                  <div className="text-sm text-slate-500">{m.text}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="card flex flex-wrap items-center justify-between gap-4 bg-gradient-to-l from-indigo-600/90 to-violet-600/90 p-8 text-white">
          <div>
            <h2 className="text-xl font-extrabold">جاهز تجرّب {BRAND.name}؟</h2>
            <p className="mt-1 text-sm text-indigo-100">شحن مجاني لكل الطلبات وإرجاع خلال 14 يوم.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/" className="btn bg-white px-6 text-indigo-700 hover:bg-indigo-50">
              تصفّح الكتالوج
            </Link>
            <Link to="/contact" className="btn border border-white/40 bg-white/10 text-white hover:bg-white/20">
              تواصل معنا
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
