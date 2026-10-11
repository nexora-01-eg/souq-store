import { describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { DatabaseSync } from 'node:sqlite'
import { one, run, runId } from '../server/db'
import { createProduct, createUser, futureExpiry, makeApp } from './helpers'

async function adminAgent(app: Express, db: DatabaseSync) {
  createUser(db, { email: 'admin@test.local', password: 'secret12', role: 'admin' })
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ email: 'admin@test.local', password: 'secret12' }).expect(200)
  return agent
}

async function customerAgent(app: Express, db: DatabaseSync) {
  createUser(db, { email: 'cust@test.local', password: 'secret12', role: 'customer' })
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ email: 'cust@test.local', password: 'secret12' }).expect(200)
  return agent
}

const customer = { name: 'زبون', phone: '01001234567', address: 'الجيزة - الدقي - شارع التحرير 45' }
const payment = () => ({ number: '4242 4242 4242 4242', exp: futureExpiry(), cvc: '123' })

describe('admin access control', () => {
  it('requires login, then admin role', async () => {
    const { app, db } = makeApp()
    await request(app).get('/api/admin/products').expect(401)

    const cust = await customerAgent(app, db)
    await cust.get('/api/admin/products').expect(403)

    const admin = await adminAgent(app, db)
    await admin.get('/api/admin/products').expect(200)
  })
})

describe('admin product management', () => {
  it('creates, reads, updates and deletes products', async () => {
    const { app, db } = makeApp()
    const admin = await adminAgent(app, db)

    const created = await admin
      .post('/api/admin/products')
      .send({
        name: 'منتج جديد',
        category: 'إلكترونيات',
        priceCents: 99900,
        stock: 12,
        emoji: '💻',
        color: '#7946e5',
        description: 'وصف',
      })
      .expect(201)
    expect(created.body.slug).toBeTruthy()
    expect(created.body.priceCents).toBe(99900)

    // Duplicate name still gets a unique slug.
    const dup = await admin
      .post('/api/admin/products')
      .send({ name: 'منتج جديد', category: 'إلكترونيات', priceCents: 100, stock: 1 })
      .expect(201)
    expect(dup.body.slug).not.toBe(created.body.slug)

    const patched = await admin
      .patch(`/api/admin/products/${created.body.id}`)
      .send({ priceCents: 79900, stock: 20, active: false })
      .expect(200)
    expect(patched.body.priceCents).toBe(79900)
    expect(patched.body.stock).toBe(20)
    expect(patched.body.active).toBe(false)

    await admin.patch(`/api/admin/products/${created.body.id}`).send({ priceCents: -5 }).expect(422)
    await admin.patch(`/api/admin/products/${created.body.id}/stock`).send({ stock: -1 }).expect(422)

    const stocked = await admin
      .patch(`/api/admin/products/${created.body.id}/stock`)
      .send({ stock: 7 })
      .expect(200)
    expect(stocked.body.stock).toBe(7)

    await admin.delete(`/api/admin/products/${created.body.id}`).expect(200)
    const list = await admin.get('/api/admin/products').expect(200)
    expect(list.body.items.find((p: { id: number }) => p.id === created.body.id)).toBeUndefined()

    await admin.delete('/api/admin/products/424242').expect(404)
  })

  it('refuses to delete a product referenced by an order', async () => {
    const { app, db } = makeApp()
    const admin = await adminAgent(app, db)
    const pid = createProduct(db, { name: 'مباع', priceCents: 5000, stock: 10 })

    await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: pid, qty: 1 }], customer, payment: payment() })
      .expect(201)

    const res = await admin.delete(`/api/admin/products/${pid}`).expect(409)
    expect(res.body.error).toContain('طلبات سابقة')
  })
})

describe('admin order management', () => {
  it('lists orders with items and filters by status', async () => {
    const { app, db } = makeApp()
    const admin = await adminAgent(app, db)
    const pid = createProduct(db, { name: 'منتج الطلب', priceCents: 7500, stock: 10 })

    await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: pid, qty: 2 }], customer, payment: payment() })
      .expect(201)

    const all = await admin.get('/api/admin/orders').expect(200)
    expect(all.body.items).toHaveLength(1)
    expect(all.body.items[0].customerName).toBe('زبون')
    expect(all.body.items[0].items[0].name).toBe('منتج الطلب')
    expect(all.body.items[0].items[0].qty).toBe(2)

    const paid = await admin.get('/api/admin/orders').query({ status: 'paid' }).expect(200)
    expect(paid.body.items).toHaveLength(1)
    const cancelled = await admin.get('/api/admin/orders').query({ status: 'cancelled' }).expect(200)
    expect(cancelled.body.items).toHaveLength(0)
    await admin.get('/api/admin/orders').query({ status: 'bogus' }).expect(422)
  })

  it('moves stock correctly across status changes', async () => {
    const { app, db } = makeApp()
    const admin = await adminAgent(app, db)
    const pid = createProduct(db, { name: 'مخزون-يتحرك', priceCents: 1000, stock: 5 })
    const stock = () => one<{ stock: number }>(db, 'SELECT stock FROM products WHERE id = ?', pid)?.stock

    const order = await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: pid, qty: 2 }], customer, payment: payment() })
      .expect(201)
    expect(stock()).toBe(3)

    // ship: no stock change
    await admin.patch(`/api/admin/orders/${order.body.id}/status`).send({ status: 'shipped' }).expect(200)
    expect(stock()).toBe(3)

    // cancel: restock
    await admin.patch(`/api/admin/orders/${order.body.id}/status`).send({ status: 'cancelled' }).expect(200)
    expect(stock()).toBe(5)

    // un-cancel: take the stock back
    await admin.patch(`/api/admin/orders/${order.body.id}/status`).send({ status: 'paid' }).expect(200)
    expect(stock()).toBe(3)

    // If stock disappears, un-cancel must fail and keep everything as is.
    await admin.patch(`/api/admin/orders/${order.body.id}/status`).send({ status: 'cancelled' }).expect(200)
    expect(stock()).toBe(5)
    runId(db, 'UPDATE products SET stock = 1 WHERE id = ?', pid)
    await admin.patch(`/api/admin/orders/${order.body.id}/status`).send({ status: 'paid' }).expect(409)
    expect(stock()).toBe(1)
    const status = one<{ status: string }>(db, 'SELECT status FROM orders WHERE id = ?', order.body.id)?.status
    expect(status).toBe('cancelled')

    await admin.patch(`/api/admin/orders/${order.body.id}/status`).send({ status: 'nope' }).expect(422)
  })
})

describe('admin reports', () => {
  it('computes KPIs, series, top products and low stock', async () => {
    const { app, db } = makeApp()
    const admin = await adminAgent(app, db)
    const main = createProduct(db, { name: 'الأكثر مبيعًا', priceCents: 10000, stock: 100 })
    createProduct(db, { name: 'كاد ينفد', priceCents: 20000, stock: 3 })

    // Order 1: paid
    await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: main, qty: 2 }], customer, payment: payment() })
      .expect(201)
    // Order 2: later cancelled
    const order2 = await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: main, qty: 1 }], customer, payment: payment() })
      .expect(201)
    await admin.patch(`/api/admin/orders/${order2.body.id}/status`).send({ status: 'cancelled' }).expect(200)

    const res = await admin.get('/api/admin/reports').query({ days: 7 }).expect(200)
    expect(res.body.days).toBe(7)
    expect(res.body.kpis.revenueCents).toBe(20000)
    expect(res.body.kpis.paidOrders).toBe(1)
    expect(res.body.kpis.allOrders).toBe(2)
    expect(res.body.kpis.unitsSold).toBe(2)
    expect(res.body.kpis.avgOrderCents).toBe(20000)
    expect(res.body.kpis.lowStockCount).toBe(1)

    expect(res.body.series).toHaveLength(7)
    const last = res.body.series[6]
    expect(last.revenueCents).toBe(20000)
    expect(last.orders).toBe(1)

    expect(res.body.topProducts[0].name).toBe('الأكثر مبيعًا')
    expect(res.body.topProducts[0].qty).toBe(2)
    expect(res.body.topProducts[0].revenueCents).toBe(20000)

    expect(res.body.lowStock.map((p: { name: string }) => p.name)).toContain('كاد ينفد')

    // No older data: previous window is empty and trends are "new".
    expect(res.body.previous).toEqual({ revenueCents: 0, paidOrders: 0 })
    expect(res.body.trends.revenuePct).toBeNull()
    expect(res.body.trends.ordersPct).toBeNull()

    // Range validation: garbage falls back to a sane window.
    const garbage = await admin.get('/api/admin/reports').query({ days: 'abc' }).expect(200)
    expect(garbage.body.days).toBe(14)
  })

  it('computes trends against the previous window', async () => {
    const { app, db } = makeApp()
    const admin = await adminAgent(app, db)
    const pid = createProduct(db, { name: 'منتج بيع', priceCents: 10000, stock: 100 })

    // One paid order 10 days ago (inside the previous 7-day window).
    const prevDate = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 19).replace('T', ' ')
    const prevOrder = runId(
      db,
      'INSERT INTO orders (user_id, customer_name, phone, address, total_cents, status, created_at) VALUES (NULL, ?, ?, ?, ?, ?, ?)',
      'عميل قديم',
      '01000000000',
      'عنوان قديم',
      50000,
      'paid',
      prevDate,
    )
    run(db, 'INSERT INTO order_items (order_id, product_id, name, price_cents, qty) VALUES (?, ?, ?, ?, ?)', prevOrder, pid, 'منتج بيع', 10000, 5)

    // One paid order now (current window): 10,000 vs 50,000 = -80%.
    await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: pid, qty: 1 }], customer, payment: payment() })
      .expect(201)

    const res = await admin.get('/api/admin/reports').query({ days: 7 }).expect(200)
    expect(res.body.previous.revenueCents).toBe(50000)
    expect(res.body.previous.paidOrders).toBe(1)
    expect(res.body.trends.revenuePct).toBe(-80)
    expect(res.body.trends.ordersPct).toBe(0)
  })
})
