import express from 'express'
import type { Router } from 'express'
import type { DatabaseSync } from 'node:sqlite'
import { all, one, run, runId } from '../db'
import { HttpError, requireInt, requireText, slugify } from '../logic'
import { requireAdmin } from '../auth'
import { toProduct, type ProductRow } from './products'

const ORDER_STATUSES = ['paid', 'shipped', 'cancelled'] as const
type OrderStatus = (typeof ORDER_STATUSES)[number]

interface AdminOrderRow {
  id: number
  user_id: number | null
  user_email: string | null
  customer_name: string
  phone: string
  address: string
  total_cents: number
  status: OrderStatus
  created_at: string
}

function parseStatus(value: unknown): OrderStatus {
  const s = requireText(value, 3, 20, 'الحالة')
  if (!ORDER_STATUSES.includes(s as OrderStatus)) {
    throw new HttpError(422, 'حالة الطلب غير معروفة')
  }
  return s as OrderStatus
}

function clampDays(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 14
  return Math.min(90, Math.max(1, Math.floor(n)))
}

function normalizeEmoji(value: unknown): string {
  if (typeof value !== 'string') return '🛍️'
  const t = value.trim().slice(0, 8)
  return t || '🛍️'
}

function normalizeColor(value: unknown): string {
  if (typeof value !== 'string') return '#7946e5'
  return /^#[0-9a-fA-F]{6}$/.test(value.trim()) ? value.trim().toLowerCase() : '#7946e5'
}

export function adminRoutes(db: DatabaseSync): Router {
  const r = express.Router()
  r.use(requireAdmin)

  // ---- products ----------------------------------------------------------

  r.get('/admin/products', (_req, res) => {
    const items = all<ProductRow & { sold: number }>(
      db,
      `SELECT p.*, COALESCE(s.sold, 0) AS sold
       FROM products p
       LEFT JOIN (
         SELECT oi.product_id AS product_id, SUM(oi.qty) AS sold
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.status IN ('paid', 'shipped')
         GROUP BY oi.product_id
       ) s ON s.product_id = p.id
       ORDER BY p.id DESC`,
    )
    res.json({ items: items.map((p) => ({ ...toProduct(p), sold: p.sold })) })
  })

  r.post('/admin/products', (req, res) => {
    const body = req.body ?? {}
    const name = requireText(body.name, 2, 100, 'اسم المنتج')
    const category = requireText(body.category, 2, 50, 'الفئة')
    const priceCents = requireInt(body.priceCents, 0, 100_000_000, 'السعر')
    const stock = requireInt(body.stock, 0, 1_000_000, 'المخزون')
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 500) : ''

    let slug = slugify(name)
    if (one(db, 'SELECT id FROM products WHERE slug = ?', slug)) {
      slug = `${slug}-${Date.now().toString(36)}`
    }
    const id = runId(
      db,
      'INSERT INTO products (slug, name, description, category, price_cents, stock, emoji, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      slug,
      name,
      description,
      category,
      priceCents,
      stock,
      normalizeEmoji(body.emoji),
      normalizeColor(body.color),
    )
    const row = one<ProductRow>(db, 'SELECT * FROM products WHERE id = ?', id)!
    res.status(201).json(toProduct(row))
  })

  r.patch('/admin/products/:id', (req, res) => {
    const id = requireInt(req.params.id, 1, 1_000_000_000, 'معرف المنتج')
    const current = one<ProductRow>(db, 'SELECT * FROM products WHERE id = ?', id)
    if (!current) throw new HttpError(404, 'المنتج غير موجود')
    const body = req.body ?? {}

    const name = body.name === undefined ? current.name : requireText(body.name, 2, 100, 'اسم المنتج')
    const category = body.category === undefined ? current.category : requireText(body.category, 2, 50, 'الفئة')
    const priceCents = body.priceCents === undefined ? current.price_cents : requireInt(body.priceCents, 0, 100_000_000, 'السعر')
    const stock = body.stock === undefined ? current.stock : requireInt(body.stock, 0, 1_000_000, 'المخزون')
    const description =
      body.description === undefined
        ? current.description
        : typeof body.description === 'string'
          ? body.description.trim().slice(0, 500)
          : current.description
    const emoji = body.emoji === undefined ? current.emoji : normalizeEmoji(body.emoji)
    const color = body.color === undefined ? current.color : normalizeColor(body.color)
    const active = body.active === undefined ? current.active : body.active ? 1 : 0

    run(
      db,
      'UPDATE products SET name = ?, category = ?, price_cents = ?, stock = ?, description = ?, emoji = ?, color = ?, active = ? WHERE id = ?',
      name,
      category,
      priceCents,
      stock,
      description,
      emoji,
      color,
      active,
      id,
    )
    res.json(toProduct(one<ProductRow>(db, 'SELECT * FROM products WHERE id = ?', id)!))
  })

  r.patch('/admin/products/:id/stock', (req, res) => {
    const id = requireInt(req.params.id, 1, 1_000_000_000, 'معرف المنتج')
    const stock = requireInt(req.body?.stock, 0, 1_000_000, 'المخزون')
    if (!one(db, 'SELECT id FROM products WHERE id = ?', id)) throw new HttpError(404, 'المنتج غير موجود')
    run(db, 'UPDATE products SET stock = ? WHERE id = ?', stock, id)
    res.json(toProduct(one<ProductRow>(db, 'SELECT * FROM products WHERE id = ?', id)!))
  })

  r.delete('/admin/products/:id', (req, res) => {
    const id = requireInt(req.params.id, 1, 1_000_000_000, 'معرف المنتج')
    const product = one<ProductRow>(db, 'SELECT * FROM products WHERE id = ?', id)
    if (!product) throw new HttpError(404, 'المنتج غير موجود')
    const used = one<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM order_items WHERE product_id = ?', id)?.c ?? 0
    if (used > 0) {
      throw new HttpError(409, 'المنتج موجود في طلبات سابقة — أخفِه بدلاً من حذفه')
    }
    run(db, 'DELETE FROM products WHERE id = ?', id)
    res.json({ ok: true })
  })

  // ---- orders ------------------------------------------------------------

  r.get('/admin/orders', (req, res) => {
    const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : null
    const params: (string | number)[] = []
    let where = ''
    if (status) {
      parseStatus(status)
      where = 'WHERE o.status = ?'
      params.push(status)
    }
    const rows = all<AdminOrderRow>(
      db,
      `SELECT o.id, o.user_id, u.email AS user_email, o.customer_name, o.phone, o.address,
              o.total_cents, o.status, o.created_at
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       ${where}
       ORDER BY o.id DESC
       LIMIT 300`,
      ...params,
    )
    const items = all<{ order_id: number } & { product_id: number; name: string; price_cents: number; qty: number }>(
      db,
      'SELECT order_id, product_id, name, price_cents, qty FROM order_items',
    )
    const byOrder = new Map<number, typeof items>()
    for (const it of items) {
      const list = byOrder.get(it.order_id) ?? []
      list.push(it)
      byOrder.set(it.order_id, list)
    }
    res.json({
      items: rows.map((o) => ({
        id: o.id,
        customerName: o.customer_name,
        userEmail: o.user_email,
        phone: o.phone,
        address: o.address,
        totalCents: o.total_cents,
        status: o.status,
        createdAt: o.created_at,
        items: (byOrder.get(o.id) ?? []).map((i) => ({
          productId: i.product_id,
          name: i.name,
          priceCents: i.price_cents,
          qty: i.qty,
        })),
      })),
    })
  })

  r.patch('/admin/orders/:id/status', (req, res) => {
    const id = requireInt(req.params.id, 1, 1_000_000_000, 'رقم الطلب')
    const next = parseStatus(req.body?.status)
    const order = one<AdminOrderRow>(db, 'SELECT * FROM orders WHERE id = ?', id)
    if (!order) throw new HttpError(404, 'الطلب غير موجود')
    if (order.status === next) {
      res.json({ ok: true, status: next })
      return
    }
    const items = all<{ product_id: number; qty: number }>(
      db,
      'SELECT product_id, qty FROM order_items WHERE order_id = ?',
      id,
    )

    db.exec('BEGIN IMMEDIATE')
    try {
      if (next === 'cancelled') {
        for (const it of items) run(db, 'UPDATE products SET stock = stock + ? WHERE id = ?', it.qty, it.product_id)
      }
      if (order.status === 'cancelled') {
        // Re-activating a cancelled order needs the stock back.
        for (const it of items) {
          const stock = one<{ stock: number }>(db, 'SELECT stock FROM products WHERE id = ?', it.product_id)?.stock ?? 0
          if (stock < it.qty) {
            throw new HttpError(409, 'لا يمكن إعادة تفعيل الطلب — المخزون غير كافٍ')
          }
        }
        for (const it of items) run(db, 'UPDATE products SET stock = stock - ? WHERE id = ?', it.qty, it.product_id)
      }
      run(db, 'UPDATE orders SET status = ? WHERE id = ?', next, id)
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
    res.json({ ok: true, status: next })
  })

  // ---- reports -----------------------------------------------------------

  r.get('/admin/reports', (req, res) => {
    const days = clampDays(req.query.days)
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 19).replace('T', ' ')
    const prevSince = new Date(Date.now() - 2 * days * 86400000).toISOString().slice(0, 19).replace('T', ' ')

    const revenue = one<{ v: number }>(
      db,
      `SELECT COALESCE(SUM(total_cents), 0) AS v FROM orders WHERE status IN ('paid','shipped') AND created_at >= ?`,
      since,
    )?.v ?? 0
    const paidOrders =
      one<{ c: number }>(
        db,
        `SELECT COUNT(*) AS c FROM orders WHERE status IN ('paid','shipped') AND created_at >= ?`,
        since,
      )?.c ?? 0
    const allOrders = one<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM orders WHERE created_at >= ?', since)?.c ?? 0
    const unitsSold =
      one<{ v: number }>(
        db,
        `SELECT COALESCE(SUM(oi.qty), 0) AS v
         FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE o.status IN ('paid','shipped') AND o.created_at >= ?`,
        since,
      )?.v ?? 0
    const lowStockCount =
      one<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM products WHERE active = 1 AND stock <= 8')?.c ?? 0

    const seriesRows = all<{ day: string; revenue: number; orders: number }>(
      db,
      `SELECT date(created_at) AS day, SUM(total_cents) AS revenue, COUNT(*) AS orders
       FROM orders
       WHERE status IN ('paid','shipped') AND created_at >= ?
       GROUP BY day ORDER BY day`,
      since,
    )
    const byDay = new Map(seriesRows.map((s) => [s.day, s]))
    const series: { day: string; revenueCents: number; orders: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      const row = byDay.get(day)
      series.push({ day, revenueCents: row?.revenue ?? 0, orders: row?.orders ?? 0 })
    }

    const topProducts = all<{ name: string; emoji: string | null; qty: number; revenue: number }>(
      db,
      `SELECT oi.name AS name, p.emoji AS emoji, SUM(oi.qty) AS qty, SUM(oi.qty * oi.price_cents) AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE o.status IN ('paid','shipped') AND o.created_at >= ?
       GROUP BY oi.product_id, oi.name
       ORDER BY revenue DESC
       LIMIT 5`,
      since,
    )
    const lowStock = all<{ id: number; name: string; stock: number; emoji: string; category: string }>(
      db,
      'SELECT id, name, stock, emoji, category FROM products WHERE active = 1 AND stock <= 8 ORDER BY stock ASC LIMIT 10',
    )

    // Same window immediately before, for trend chips.
    const prev = one<{ rev: number; cnt: number }>(
      db,
      `SELECT COALESCE(SUM(total_cents), 0) AS rev, COUNT(*) AS cnt
       FROM orders
       WHERE status IN ('paid','shipped') AND created_at >= ? AND created_at < ?`,
      prevSince,
      since,
    ) ?? { rev: 0, cnt: 0 }
    const pct = (current: number, previous: number): number | null =>
      previous > 0 ? Math.round(((current - previous) / previous) * 100) : null

    res.json({
      days,
      kpis: {
        revenueCents: revenue,
        paidOrders,
        allOrders,
        unitsSold,
        avgOrderCents: paidOrders > 0 ? Math.round(revenue / paidOrders) : 0,
        lowStockCount,
      },
      previous: { revenueCents: prev.rev, paidOrders: prev.cnt },
      trends: { revenuePct: pct(revenue, prev.rev), ordersPct: pct(paidOrders, prev.cnt) },
      series,
      topProducts: topProducts.map((t) => ({
        name: t.name,
        emoji: t.emoji ?? '🛍️',
        qty: t.qty,
        revenueCents: t.revenue,
      })),
      lowStock,
    })
  })

  return r
}
