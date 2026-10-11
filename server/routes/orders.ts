import express from 'express'
import type { Router } from 'express'
import type { DatabaseSync } from 'node:sqlite'
import { all, one, run, runId } from '../db'
import {
  HttpError,
  cardDigits,
  cvcValid,
  expiryValid,
  isTestDecline,
  luhnValid,
  requireInt,
  requireText,
} from '../logic'
import { requireAuth } from '../auth'

interface OrderRow {
  id: number
  user_id: number | null
  customer_name: string
  phone: string
  address: string
  total_cents: number
  status: 'paid' | 'shipped' | 'cancelled'
  created_at: string
}

interface OrderItemRow {
  product_id: number
  name: string
  price_cents: number
  qty: number
}

function shapeOrder(order: OrderRow, items: OrderItemRow[]) {
  return {
    id: order.id,
    customerName: order.customer_name,
    phone: order.phone,
    address: order.address,
    totalCents: order.total_cents,
    status: order.status,
    createdAt: order.created_at,
    items: items.map((i) => ({
      productId: i.product_id,
      name: i.name,
      priceCents: i.price_cents,
      qty: i.qty,
    })),
  }
}

export function ordersRoutes(db: DatabaseSync): Router {
  const r = express.Router()

  r.post('/orders', (req, res) => {
    const body = req.body ?? {}
    const customer = body.customer ?? {}
    const payment = body.payment ?? {}

    const name = requireText(customer.name, 2, 80, 'الاسم')
    const phone = requireText(customer.phone, 8, 20, 'رقم الهاتف')
    if (!/^[0-9+\-\s]+$/.test(phone)) throw new HttpError(422, 'رقم الهاتف غير صالح')
    const address = requireText(customer.address, 5, 200, 'العنوان')

    if (!luhnValid(payment.number)) {
      throw new HttpError(422, 'رقم البطاقة غير صالح — للتجربة استخدم 4242 4242 4242 4242')
    }
    if (!expiryValid(payment.exp)) throw new HttpError(422, 'تاريخ انتهاء الصلاحية غير صالح (MM/YY)')
    if (!cvcValid(payment.cvc)) throw new HttpError(422, 'رمز الأمان غير صالح')
    if (isTestDecline(cardDigits(payment.number))) {
      throw new HttpError(402, 'رفض البنك التجريبي هذه البطاقة — جرّب بطاقة أخرى')
    }

    const rawItems: unknown = body.items
    if (!Array.isArray(rawItems) || rawItems.length === 0) throw new HttpError(400, 'السلة فارغة')
    if (rawItems.length > 50) throw new HttpError(400, 'عدد المنتجات في السلة كبير جداً')

    const qtyMap = new Map<number, number>()
    for (const raw of rawItems) {
      const productId = requireInt((raw as { productId?: unknown })?.productId, 1, 1_000_000_000, 'معرف المنتج')
      const qty = requireInt((raw as { qty?: unknown })?.qty, 1, 99, 'الكمية')
      qtyMap.set(productId, (qtyMap.get(productId) ?? 0) + qty)
    }

    db.exec('BEGIN IMMEDIATE')
    try {
      let total = 0
      const lines: { id: number; name: string; price: number; qty: number }[] = []
      for (const [productId, qty] of qtyMap) {
        const p = one<{ id: number; name: string; price_cents: number; stock: number; active: number }>(
          db,
          'SELECT id, name, price_cents, stock, active FROM products WHERE id = ?',
          productId,
        )
        if (!p || p.active !== 1) throw new HttpError(404, 'منتج غير موجود في السلة')
        if (p.stock < qty) {
          throw new HttpError(409, `الكمية المطلوبة من «${p.name}» غير متوفرة (المتاح ${p.stock})`)
        }
        // Price always comes from the database, never from the client.
        total += p.price_cents * qty
        lines.push({ id: p.id, name: p.name, price: p.price_cents, qty })
      }

      const orderId = runId(
        db,
        'INSERT INTO orders (user_id, customer_name, phone, address, total_cents, status) VALUES (?, ?, ?, ?, ?, ?)',
        req.user?.id ?? null,
        name,
        phone,
        address,
        total,
        'paid',
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
        run(db, 'UPDATE products SET stock = stock - ? WHERE id = ?', line.qty, line.id)
      }
      db.exec('COMMIT')

      const createdAt =
        one<{ created_at: string }>(db, 'SELECT created_at FROM orders WHERE id = ?', orderId)?.created_at ?? ''
      res.status(201).json(
        shapeOrder(
          {
            id: orderId,
            user_id: req.user?.id ?? null,
            customer_name: name,
            phone,
            address,
            total_cents: total,
            status: 'paid',
            created_at: createdAt,
          },
          lines.map((l) => ({ product_id: l.id, name: l.name, price_cents: l.price, qty: l.qty })),
        ),
      )
    } catch (err) {
      db.exec('ROLLBACK')
      throw err
    }
  })

  r.get('/orders/:id', (req, res) => {
    const id = requireInt(req.params.id, 1, 1_000_000_000, 'رقم الطلب')
    const order = one<OrderRow>(db, 'SELECT * FROM orders WHERE id = ?', id)
    if (!order) throw new HttpError(404, 'الطلب غير موجود')
    if (!req.user || order.user_id !== req.user.id) {
      throw new HttpError(403, 'لا يمكن عرض هذا الطلب')
    }
    const items = all<OrderItemRow>(
      db,
      'SELECT product_id, name, price_cents, qty FROM order_items WHERE order_id = ?',
      id,
    )
    res.json(shapeOrder(order, items))
  })

  // Order history for the signed-in customer.
  r.get('/my/orders', requireAuth, (req, res) => {
    const userId = req.user?.id ?? -1
    const rows = all<OrderRow>(
      db,
      'SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 50',
      userId,
    )
    const ids = rows.map((o) => o.id)
    const byOrder = new Map<number, OrderItemRow[]>()
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',')
      const items = all<OrderItemRow & { order_id: number }>(
        db,
        `SELECT order_id, product_id, name, price_cents, qty FROM order_items WHERE order_id IN (${placeholders})`,
        ...ids,
      )
      for (const it of items) {
        const list = byOrder.get(it.order_id) ?? []
        list.push(it)
        byOrder.set(it.order_id, list)
      }
    }
    res.json({ items: rows.map((o) => shapeOrder(o, byOrder.get(o.id) ?? [])) })
  })

  return r
}
