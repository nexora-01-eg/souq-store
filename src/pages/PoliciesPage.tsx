import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BRAND } from '../../shared/brand'
import Breadcrumbs from '../components/Breadcrumbs'
import Reveal from '../components/Reveal'

const POLICIES = [
  {
    id: 'shipping',
    icon: '🚚',
    title: 'الشحن والتوصيل',
    points: [
      'شحن مجاني على كل الطلبات بدون حد أدنى، لكل محافظات مصر.',
      'التوصيل خلال 2 لـ 4 أيام عمل (الرياض، الدلتا، والصعيد حتى 5 أيام).',
      'بيرّاقب الشحنونا بيتأكد من المنتج قبل التسليم، ومعاك حق الرفض عند الاستلام.',
      'تتبع حالة طلبك من صفحة «طلباتي» في أي وقت.',
    ],
  },
  {
    id: 'returns',
    icon: '↩️',
    title: 'الإرجاع والاستبدال',
    points: [
      'إرجاع مجاني خلال 14 يوم من الاستلام بشرط أن المنتج بحالته الأصلية.',
      'الاستبدال متاح خلال نفس المدة، والفرق في السعر بيتم حسابه فورًا.',
      'الاسترداد بيتم بنفس وسيلة الدفع خلال 3 لـ 7 أيام عمل.',
      'المنتجات الشخصية (الجمال والعطور) لها سياسة خاصة: مفتوحة = غير قابلة للإرجاع.',
    ],
  },
  {
    id: 'payment',
    icon: '💳',
    title: 'الدفع والأمان',
    points: [
      'هذا الموقع نسخة تجريبية: الدفع محاكى بالكامل ولا يُخصم أي مبلغ حقيقي.',
      'في النسخة الإنتاجية بنقبل البطاقات البنكية والمحافظ الإلكترونية والدفع عند الاستلام.',
      'كل بيانات البطاقة بتتشفر أثناء الإرسال ولا بتتخزن عندنا إطلاقًا.',
      'بنراجع أي عملية بشكل آلي ضد الاحتيال قبل تأكيد الطلب.',
    ],
  },
  {
    id: 'privacy',
    icon: '🔒',
    title: 'الخصوصية وبياناتك',
    points: [
      'بنستخدم بياناتك (الاسم، الهاتف، العنوان) لتنفيذ طلبك فقط.',
      'مبنشاركش بياناتك مع أي طرف تالت إلا لشركة الشحن لأغراض التوصيل.',
      'الجلسات مشفّرة وكلمات المرور بتتخزن بصيغة غير قابلة للقراءة.',
      'تقدر تطلب حذف حسابك في أي وقت عن طريق الخط الموحد أو البريد.',
    ],
  },
]

export default function PoliciesPage() {
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    const el = document.getElementById(location.hash.slice(1))
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash])

  return (
    <div className="fade-in mx-auto max-w-4xl px-4 py-8">
      {/* #37 */}
      <Breadcrumbs items={[{ label: 'السياسات' }]} />

      {/* #24 #25 #4 — branded header band */}
      <header className="relative mt-3 overflow-hidden rounded-[2rem] text-white">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,#472e81 0%,#4c1d95 45%,#831843 100%)' }} />
        <div className="absolute inset-0 opacity-90" style={{ background: 'var(--atlas-aurora)' }} />
        <span
          aria-hidden
          className="watermark pointer-events-none absolute -bottom-5 right-6 text-[6rem] leading-none"
          style={{ WebkitTextStrokeColor: 'rgba(255,255,255,.18)' }}
        >
          {BRAND.latin}
        </span>
        <div className="relative px-6 py-10 text-center sm:px-10">
          <span className="eyebrow justify-center" style={{ color: 'rgba(255,255,255,.8)' }}>
            Our policies
          </span>
          <h1 className="display mt-3 text-3xl text-white md:text-4xl">سياسات {BRAND.name}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-indigo-100">
            كل القواعد مكتوبة ببساطة — بدون حروف صغيرة. سارية من يناير 2026.
          </p>
        </div>
      </header>

      {/* #74 — quick jump pills */}
      <nav className="mt-6 flex flex-wrap justify-center gap-2">
        {POLICIES.map((p) => (
          <a key={p.id} href={`#${p.id}`} className="btn btn-ghost text-xs">
            {p.icon} {p.title}
          </a>
        ))}
      </nav>

      <div className="mt-6 space-y-6">
        {POLICIES.map((p, i) => (
          <Reveal key={p.id} delay={i * 70}>
            <section id={p.id} className="card scroll-mt-24 p-7">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 text-xl backdrop-blur">
                  {p.icon}
                </span>
                <div>
                  {/* #30 — section numbers */}
                  <span className="tnum text-xs font-extrabold text-indigo-500">{`#0${i + 1}`}</span>
                  <h2 className="display text-xl">{p.title}</h2>
                </div>
              </div>
              <ul className="mt-5 space-y-3">
                {p.points.map((point) => (
                  <li key={point} className="flex gap-3 text-sm leading-7 text-slate-600">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500" />
                    {point}
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        ))}
      </div>

      <div className="card mt-8 p-7 text-center">
        <p className="text-sm text-slate-500">عندك سؤال مش لاقيه إجابته؟</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link to="/contact" className="btn btn-primary">
            تواصل معنا
          </Link>
          <a href={`tel:${BRAND.hotline}`} className="btn btn-ghost" dir="ltr">
            📞 {BRAND.hotline}
          </a>
        </div>
      </div>
    </div>
  )
}
