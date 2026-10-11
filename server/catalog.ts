import type { DatabaseSync } from 'node:sqlite'
import { one, run } from './db'
import { slugify } from './logic'

export const CATALOG_TARGET = 1200

interface CategoryPlan {
  category: string
  emoji: string[]
  nouns: string[]
  features: string[]
  basePrice: number // cents
}

export const PALETTE = ['#7946e5', '#02b2c7', '#059669', '#d97706', '#e11d48', '#ac3aed', '#0d9488', '#db2777', '#1aa1f4', '#ea580c']
const SERIES = ['Studio', 'Pro', 'Max', 'Lite', 'Prime', 'Elite', 'Nova', 'Air', 'Core', 'Ultra']
const COLORS_AR = ['أسود', 'فضي', 'ذهبي', 'أزرق', 'أحمر', 'أخضر', 'رمادي', 'بني']
const CURATED_DESCRIPTIONS = [
  'جودة أطلس المعتمدة مع ضمان سنتين وشحن مجاني لكل الطلبات.',
  'تصميم عملي وخامات تدوم، بمعايير الاختبار الداخلية لبراند أطلس.',
  'أداء ثابت يوميًا مع خدمة عملاء محلية على مدار الأسبوع.',
  'منتج من سلسلة أطلس الأساسية — اختُبر في مختبراتنا قبل النشر.',
]

const PLANS: CategoryPlan[] = [
  {
    category: 'إلكترونيات',
    emoji: ['🎧', '⌚', '⌨️', '🔌', '🔋', '🎤', '📷', '🖥️', '📱', '💾', '🎮', '📺'],
    nouns: ['سماعات', 'ساعة ذكية', 'لوحة مفاتيح', 'شاحن', 'باور بانك', 'ميكروفون', 'كاميرا', 'شاشة', 'هاتف', 'قرص صلب', 'يد تحكم', 'مكبر صوت', 'راوتر', 'قرص SSD', 'قارئ بطاقات'],
    features: ['اتصال مستقر وسريع', 'بطارية تدوم طويلًا', 'خامات مقاومة للخدش', 'ضمان محلي سنتين'],
    basePrice: 149900,
  },
  {
    category: 'أزياء',
    emoji: ['👟', '🧥', '👕', '🎒', '👖', '🧢', '👜', '🧣'],
    nouns: ['حذاء رياضي', 'جاكيت', 'تيشيرت', 'حقيبة ظهر', 'بنطلون', 'كاب', 'شنطة يد', 'وشاح', 'قطنية', 'بلوزة', 'فستان', 'حذاء كاجوال'],
    features: ['قماش مريح يتحمل الغسيل', 'قصّة عصرية مقاسات كاملة', 'خياطة مزدوجة متينة', 'ألوان ثابتة لا تبهت'],
    basePrice: 79900,
  },
  {
    category: 'منزل ومطبخ',
    emoji: ['☕', '🫖', '🍶', '💡', '🧺', '🍳', '🔪', '🛋️', '🛏️'],
    nouns: ['مطحنة قهوة', 'غلاية', 'طقم أكواب', 'مصباح', 'سلة تخزين', 'طقم طهي', 'سكين شيف', 'وسادة', 'مفروشات', 'خلاط', 'ميكروويف صغير', 'منظم مطبخ'],
    features: ['خامات آمنة غذائيًا', 'سهل التنظيف', 'مقاوم للحرارة العالية', 'يشغل مساحة صغيرة'],
    basePrice: 64900,
  },
  {
    category: 'رياضة',
    emoji: ['🥤', '🪢', '🏋️', '⚽', '🎾', '🚲', '🏃'],
    nouns: ['زجاجة مياه', 'حبل مقاومة', 'طقم دمبل', 'كرة قدم', 'مضرب تنس', 'دراجة تمرين', 'سجادة يوجا', 'حزام رياضي', 'قفازات رفع', 'جهاز لمسح الضغط'],
    features: ['مقاوم للتعرق والصدأ', 'يخدم جميع المستويات', 'خفيف وسهل الحمل', 'اختبار حِمل حتى 200 كجم'],
    basePrice: 54900,
  },
  {
    category: 'جمال',
    emoji: ['🌸', '🧴', '💇', '💅', '🪥', '✨'],
    nouns: ['عطر', 'كريم مرطب', 'زيت أرغان', 'سيروم', 'ماسك وجه', 'فرشاة أسنان كهربائية', 'ماكينة حلاقة', 'بلسم', 'شامبو', 'أحمر شفاه'],
    features: ['مكوّنات طبيعية معتمدة', 'خالٍ من المواد الضارة', 'مناسب لجميع أنواع البشرة', 'اختبارات جلدية مكتملة'],
    basePrice: 44900,
  },
  {
    category: 'كتب',
    emoji: ['📖', '📚', '🖊️', '📓'],
    nouns: ['رواية', 'كتاب تطوير ذات', 'كتاب أعمال', 'دفتر ملاحظات', 'ملحق دراسي', 'سيرة ذاتية ملهمة', 'كتاب طبخ', 'أطلس خرائط'],
    features: ['طباعة فاخرة وورق ثقيل', 'ترجمة معتمدة', 'دفعة محدودة', 'توقيع المؤلف في النسخ الأولى'],
    basePrice: 29900,
  },
  {
    category: 'ألعاب',
    emoji: ['🎮', '🕹️', '🧸', '🎲', '🧩', '🪀'],
    nouns: ['يد تحكم لاسلكية', 'لعبة متابعة', 'شطرنج', 'ليغو بناء', 'دمية أطفال', 'بازل 1000 قطعة', 'كرة قفز', 'لعبة أطفال تعليمية'],
    features: ['خامات آمنة للأطفال', 'تعزز التركيز والإبداع', 'مناسب لعمر 6+', 'معتمد أوروبي CE'],
    basePrice: 39900,
  },
  {
    category: 'مستلزمات أطفال',
    emoji: ['🍼', '🧸', '🎠', '🚼', '🚗', '👶'],
    nouns: ['رضاعة', 'كرسي أطفال', 'عربة مشي', 'سماعة أطفال', 'بطانية', 'ملابس قطنية', 'حذاء أول خطوة', 'كرسي طعام'],
    features: ['قطن عضوي 100%', 'خالٍ من BPA', 'سهل التعقيم', 'مطابق لمعايير السلامة'],
    basePrice: 34900,
  },
]

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(rnd: () => number, arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)]
}

/** Fill the catalog up to CATALOG_TARGET products. Idempotent. */
export function ensureCatalog(db: DatabaseSync): number {
  const count = one<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM products')?.c ?? 0
  if (count >= CATALOG_TARGET) return count

  const rnd = mulberry32(20150101) // fixed seed → stable catalog across runs
  const insertOne = `
    INSERT INTO products (slug, name, description, category, price_cents, stock, emoji, color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `

  db.exec('BEGIN')
  try {
    for (let n = count + 1; n <= CATALOG_TARGET; n++) {
      const plan = PLANS[(n - 1) % PLANS.length]
      const noun = pick(rnd, plan.nouns)
      const series = pick(rnd, SERIES)
      const colorAr = pick(rnd, COLORS_AR)
      const name = `أطلس ${noun} ${series} ${colorAr}`

      let slug = slugify(name)
      const clash = one<{ id: number }>(db, 'SELECT id FROM products WHERE slug = ?', slug)
      if (clash) slug = `${slug}-at-${n}`

      // Price: base ± 45%, ending in .49/.99 for realistic tags.
      const factor = 0.55 + rnd() * 0.9
      const raw = Math.round(plan.basePrice * factor)
      const priceCents = Math.max(990, Math.floor(raw / 100) * 100 + (rnd() > 0.5 ? 99 : 49))

      // Mostly healthy stock, some scarce items for low-stock alerts.
      const stockRoll = rnd()
      const stock = stockRoll < 0.08 ? 1 + Math.floor(rnd() * 8) : 15 + Math.floor(rnd() * 180)

      const description = `${noun} من سلسلة ${series} — ${pick(rnd, plan.features)}. ${pick(rnd, CURATED_DESCRIPTIONS)}`

      run(
        db,
        insertOne,
        slug,
        name,
        description,
        plan.category,
        priceCents,
        stock,
        pick(rnd, plan.emoji),
        pick(rnd, PALETTE),
      )
    }
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }

  return one<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM products')?.c ?? 0
}
