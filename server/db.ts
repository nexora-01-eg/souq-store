import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { hashPassword } from './auth'
import { slugify } from './logic'
import { ensureCatalog } from './catalog'

export type SqlParam = null | number | bigint | string | Uint8Array

export function openDb(dbPath: string): DatabaseSync {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true })
  }
  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA foreign_keys = ON;')
  return db
}

export function one<T>(db: DatabaseSync, sql: string, ...params: SqlParam[]): T | undefined {
  return db.prepare(sql).get(...params) as unknown as T | undefined
}

export function all<T>(db: DatabaseSync, sql: string, ...params: SqlParam[]): T[] {
  return db.prepare(sql).all(...params) as unknown as T[]
}

export function run(db: DatabaseSync, sql: string, ...params: SqlParam[]): number {
  return Number(db.prepare(sql).run(...params).changes)
}

export function runId(db: DatabaseSync, sql: string, ...params: SqlParam[]): number {
  return Number(db.prepare(sql).run(...params).lastInsertRowid)
}

export function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      emoji TEXT NOT NULL DEFAULT '🛍️',
      color TEXT NOT NULL DEFAULT '#7946e5',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      total_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','shipped','cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS order_items (
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      name TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      qty INTEGER NOT NULL CHECK (qty > 0),
      PRIMARY KEY (order_id, product_id)
    );
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_price ON products(active, price_cents);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  `)
}

// ---------------------------------------------------------------------------
// Demo seed: catalog, demo accounts and 14 days of historical orders so the
// admin reports open on realistic numbers.
// ---------------------------------------------------------------------------

interface SeedProduct {
  name: string
  category: string
  priceCents: number
  stock: number
  emoji: string
  color: string
  description: string
}

const SEED_PRODUCTS: SeedProduct[] = [
  { name: 'سماعات بلوتوث لاسلكية', category: 'إلكترونيات', priceCents: 129900, stock: 40, emoji: '🎧', color: '#7946e5', description: 'صوت نقي مع عزل ضوضاء وبطارية تدوم 30 ساعة.' },
  { name: 'ساعة ذكية رياضية', category: 'إلكترونيات', priceCents: 249900, stock: 25, emoji: '⌚', color: '#02b2c7', description: 'تتبع النوم والخطوات ومعدل نبض القلب مع شاشة AMOLED.' },
  { name: 'لوحة مفاتيح ميكانيكية', category: 'إلكترونيات', priceCents: 189900, stock: 18, emoji: '⌨️', color: '#334155', description: 'مفاتيح حمراء هادئة وإضاءة RGB قابلة للتخصيص.' },
  { name: 'شاحن سريع 65 واط', category: 'إلكترونيات', priceCents: 44900, stock: 60, emoji: '🔌', color: '#d97706', description: 'يشحن الهاتف في 30 دقيقة ويدعم الأجهزة اللوحية أيضًا.' },
  { name: 'باور بانك 20000mAh', category: 'إلكترونيات', priceCents: 79900, stock: 35, emoji: '🔋', color: '#059669', description: 'شحن مزدوج سريع مع شاشة رقمية لنسبة البطارية.' },
  { name: 'ميكروفون تسجيل احترافي', category: 'إلكترونيات', priceCents: 159900, stock: 12, emoji: '🎤', color: '#e11d48', description: 'مثالي للبودكاست والبث المباشر، يدعم USB وXLR.' },
  { name: 'كاميرا مراقبة منزلية', category: 'إلكترونيات', priceCents: 99900, stock: 22, emoji: '📷', color: '#08b2ab', description: 'رؤية ليلية 1080p مع تنبيهات ذكية على الهاتف.' },
  { name: 'مكبر صوت بلوتوث', category: 'إلكترونيات', priceCents: 89900, stock: 3, emoji: '🔊', color: '#ac3aed', description: 'صوت 360 درجة ومقاومة للماء بمعيار IPX7.' },
  { name: 'حذاء رياضي مريح', category: 'أزياء', priceCents: 109900, stock: 45, emoji: '👟', color: '#ea580c', description: 'نعل امتصاص صدمات خفيف يناسب الجري والمشي اليومي.' },
  { name: 'جاكيت جينز كلاسيك', category: 'أزياء', priceCents: 149900, stock: 20, emoji: '🧥', color: '#1aa1f4', description: 'قصة عصرية وقماش جينز ثقيل يدوم طويلًا.' },
  { name: 'تيشيرت قطن أساسي', category: 'أزياء', priceCents: 29900, stock: 80, emoji: '👕', color: '#0d9488', description: 'قطن 100% مريح مع ألوان ثابتة بعد الغسيل.' },
  { name: 'حقيبة ظهر عملية', category: 'أزياء', priceCents: 79900, stock: 30, emoji: '🎒', color: '#65a30d', description: 'مساحة للابتوب 15" ومقاسات، ومقاومة للماء.' },
  { name: 'نظارة شمسية عاكسة', category: 'أزياء', priceCents: 59900, stock: 6, emoji: '🕶️', color: '#ca8a04', description: 'عدسات مستقطبة UV400 وإطار معدني خفيف.' },
  { name: 'مطحنة قهوة يدوية', category: 'منزل ومطبخ', priceCents: 64900, stock: 28, emoji: '☕', color: '#78350f', description: '17 درجة طحن مع مجارس ستانلس متينة.' },
  { name: 'غلاية كهربائية زجاجية', category: 'منزل ومطبخ', priceCents: 54900, stock: 33, emoji: '🫖', color: '#02b2c7', description: 'سعة 1.7 لتر مع إطفاء تلقائي وفلتر للاهتزاز.' },
  { name: 'طقم أكواب سيراميك (6)', category: 'منزل ومطبخ', priceCents: 39900, stock: 50, emoji: '🍶', color: '#059669', description: 'أكواب أنيقة تتحمل الغسالة، حجم 320 مل.' },
  { name: 'مصباح مكتبي LED', category: 'منزل ومطبخ', priceCents: 49900, stock: 2, emoji: '💡', color: '#d97706', description: 'ثلاث درجات إضاءة وذراع مرن لتقليل إجهاد العين.' },
  { name: 'سجادة أرضية مزخرفة', category: 'منزل ومطبخ', priceCents: 129900, stock: 15, emoji: '🧶', color: '#dc2626', description: 'نمط شرقي بألوان ثابتة وقطن ناعم 160×230 سم.' },
  { name: 'زجاجة مياه رياضية 1 لتر', category: 'رياضة', priceCents: 24900, stock: 70, emoji: '🥤', color: '#179bee', description: 'بلاستيك خالٍ من BPA مع فتحة سريعة للاستهلاك أثناء التمرين.' },
  { name: 'حبل مقاومة مطاطي', category: 'رياضة', priceCents: 44900, stock: 40, emoji: '🪢', color: '#16a34a', description: 'مجموعة 5 مقاومات مختلفة لتمارين المنزل الكاملة.' },
  { name: 'طقم دمبل 10 كجم', category: 'رياضة', priceCents: 89900, stock: 5, emoji: '🏋️', color: '#52525b', description: 'زوج دمبل مطاطي ثقيل لتمارين القوة.' },
  { name: 'عطر شرقي فاخر 50مل', category: 'جمال', priceCents: 189900, stock: 26, emoji: '🌸', color: '#db2777', description: 'مزيج عنبر وخشب الصندل بثبات يصل 12 ساعة.' },
  { name: 'كريم مرطب بالافوكادو', category: 'جمال', priceCents: 34900, stock: 55, emoji: '🧴', color: '#65a30d', description: 'ترطيب عميق بخلاصة الأفوكادو لجميع أنواع البشرة.' },
  { name: 'رواية ليلة النهاية', category: 'كتب', priceCents: 8900, stock: 90, emoji: '📖', color: '#ac3aed', description: 'رواية مشوقة في 320 صفحة بطباعة فاخرة.' },
]

const SEED_ADMINS = [
  { email: 'admin@demo.local', name: 'مدير المتجر', password: 'admin1234', role: 'admin' },
  { email: 'customer@demo.local', name: 'عميل تجريبي', password: 'customer1234', role: 'customer' },
]

const SEED_CUSTOMERS = [
  { name: 'أحمد سالم', phone: '01001234567' },
  { name: 'منى خالد', phone: '01122334455' },
  { name: 'كريم عبد الله', phone: '01234567890' },
  { name: 'سارة فؤاد', phone: '01098765432' },
  { name: 'محمود علي', phone: '01555123456' },
  { name: 'نور حسن', phone: '01077889900' },
  { name: 'ياسمين طارق', phone: '01144556677' },
  { name: 'عمرو زكي', phone: '01200112233' },
]

const SEED_ADDRESSES = [
  'القاهرة - مدينة نصر - شارع مصطفى النحاس 12',
  'الجيزة - الدقي - شارع التحرير 45',
  'الإسكندرية - سموحة - شارع فوزي معاذ 8',
  'القاهرة - المعادي - شارع 9',
  'الجيزة - الهرم - شارع ترسا 33',
  'القاهرة - رمسيس - شارع الشهداء 21',
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

function iso(dt: Date): string {
  return dt.toISOString().slice(0, 19).replace('T', ' ')
}

function ensureUser(db: DatabaseSync, email: string, name: string, password: string, role: string): void {
  if (one(db, 'SELECT id FROM users WHERE email = ?', email)) return
  const { salt, hash } = hashPassword(password)
  run(db, 'INSERT INTO users (email, name, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)', email, name, hash, salt, role)
}

function seedProducts(db: DatabaseSync): void {
  for (const p of SEED_PRODUCTS) {
    run(
      db,
      'INSERT INTO products (slug, name, description, category, price_cents, stock, emoji, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      slugify(p.name),
      p.name,
      p.description,
      p.category,
      p.priceCents,
      p.stock,
      p.emoji,
      p.color,
    )
  }
}

function seedDemoOrders(db: DatabaseSync): void {
  const products = all<{ id: number; name: string; price_cents: number }>(
    db,
    'SELECT id, name, price_cents FROM products',
  )
  if (products.length === 0) return
  const rnd = mulberry32(20261004)
  const now = Date.now()

  for (let i = 0; i < 42; i++) {
    const daysAgo = Math.floor(rnd() * 14)
    const created = new Date(now - daysAgo * 86400000)
    created.setUTCHours(8 + Math.floor(rnd() * 12), Math.floor(rnd() * 60), 0, 0)
    if (created.getTime() > now) created.setTime(created.getTime() - 86400000)

    const lineCount = 1 + Math.floor(rnd() * 3)
    const picked = new Map<number, number>()
    while (picked.size < Math.min(lineCount, products.length)) {
      const p = products[Math.floor(rnd() * products.length)]
      picked.set(p.id, 1 + Math.floor(rnd() * 3))
    }

    let total = 0
    const lines: { id: number; name: string; price: number; qty: number }[] = []
    for (const [id, qty] of picked) {
      const p = products.find((x) => x.id === id)!
      total += p.price_cents * qty
      lines.push({ id: p.id, name: p.name, price: p.price_cents, qty })
    }

    const r = rnd()
    const status = r < 0.6 ? 'paid' : r < 0.9 ? 'shipped' : 'cancelled'
    const cust = SEED_CUSTOMERS[Math.floor(rnd() * SEED_CUSTOMERS.length)]
    const address = SEED_ADDRESSES[Math.floor(rnd() * SEED_ADDRESSES.length)]

    const orderId = runId(
      db,
      'INSERT INTO orders (user_id, customer_name, phone, address, total_cents, status, created_at) VALUES (NULL, ?, ?, ?, ?, ?, ?)',
      cust.name,
      cust.phone,
      address,
      total,
      status,
      iso(created),
    )
    for (const line of lines) {
      run(
        db,
        'INSERT INTO order_items (order_id, product_id, name, price_cents, qty) VALUES (?, ?, ?, ?, ?)',
        orderId,
        line.id,
        line.name,
        line.price,
        line.qty,
      )
    }
  }
}

export function seedDemo(db: DatabaseSync): void {
  const productCount = one<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM products')?.c ?? 0
  if (productCount === 0) seedProducts(db)

  for (const u of SEED_ADMINS) ensureUser(db, u.email, u.name, u.password, u.role)

  const orderCount = one<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM orders')?.c ?? 0
  if (orderCount === 0) seedDemoOrders(db)

  // Brand launch: top the catalog up to the full 1200-product lineup.
  ensureCatalog(db)
}
