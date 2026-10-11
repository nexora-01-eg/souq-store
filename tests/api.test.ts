import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { one } from '../server/db'
import { createProduct, createUser, declinedCard, futureExpiry, makeApp } from './helpers'

describe('health', () => {
  it('answers on /api/health', async () => {
    const { app } = makeApp()
    const res = await request(app).get('/api/health').expect(200)
    expect(res.body).toEqual({ ok: true })
  })
})

describe('catalog API', () => {
  function seedCatalog(db: ReturnType<typeof makeApp>['db']) {
    createProduct(db, { name: 'سماعات بلوتوث', priceCents: 10000, stock: 5, category: 'إلكترونيات' })
    createProduct(db, { name: 'حذاء رياضي', priceCents: 50000, stock: 5, category: 'أزياء' })
    createProduct(db, { name: 'ساعة ذكية', priceCents: 30000, stock: 5, category: 'إلكترونيات' })
    createProduct(db, { name: 'منتج مخفي', priceCents: 1000, stock: 5, active: false })
  }

  it('lists active products with categories', async () => {
    const { app, db } = makeApp()
    seedCatalog(db)
    const res = await request(app).get('/api/products').expect(200)
    expect(res.body.total).toBe(3)
    const cats = res.body.categories.map((c: { category: string }) => c.category).sort()
    expect(cats).toEqual(['أزياء', 'إلكترونيات'])
  })

  it('filters by search text', async () => {
    const { app, db } = makeApp()
    seedCatalog(db)
    const res = await request(app).get('/api/products').query({ search: 'سماعات' }).expect(200)
    expect(res.body.items).toHaveLength(1)
    expect(res.body.items[0].name).toBe('سماعات بلوتوث')
  })

  it('filters by category and price range (in cents)', async () => {
    const { app, db } = makeApp()
    seedCatalog(db)
    const byCat = await request(app).get('/api/products').query({ category: 'إلكترونيات' }).expect(200)
    expect(byCat.body.total).toBe(2)

    const byPrice = await request(app)
      .get('/api/products')
      .query({ min: '20000', max: '40000' })
      .expect(200)
    expect(byPrice.body.total).toBe(1)
    expect(byPrice.body.items[0].name).toBe('ساعة ذكية')
  })

  it('sorts by price ascending', async () => {
    const { app, db } = makeApp()
    seedCatalog(db)
    const res = await request(app).get('/api/products').query({ sort: 'price_asc' }).expect(200)
    const prices = res.body.items.map((p: { priceCents: number }) => p.priceCents)
    expect(prices).toEqual([10000, 30000, 50000])
  })

  it('paginates results', async () => {
    const { app, db } = makeApp()
    for (let i = 1; i <= 14; i++) {
      createProduct(db, { name: `منتج رقم ${i}`, priceCents: 1000 * i, stock: 3 })
    }
    const page1 = await request(app).get('/api/products').query({ page: '1' }).expect(200)
    expect(page1.body.items).toHaveLength(12)
    expect(page1.body.pages).toBe(2)
    const page2 = await request(app).get('/api/products').query({ page: '2' }).expect(200)
    expect(page2.body.items).toHaveLength(2)
    expect(page2.body.page).toBe(2)
  })

  it('honors the perPage parameter (clamped 6..48)', async () => {
    const { app, db } = makeApp()
    for (let i = 1; i <= 30; i++) {
      createProduct(db, { name: `منتج حجم ${i}`, priceCents: 1000 * i, stock: 3 })
    }
    const small = await request(app).get('/api/products').query({ perPage: '10' }).expect(200)
    expect(small.body.items).toHaveLength(10)
    expect(small.body.pages).toBe(3)

    const wide = await request(app).get('/api/products').query({ perPage: '48' }).expect(200)
    expect(wide.body.items).toHaveLength(30)
    expect(wide.body.pages).toBe(1)

    const clamped = await request(app).get('/api/products').query({ perPage: '999' }).expect(200)
    expect(clamped.body.items.length).toBeLessThanOrEqual(48)
  })

  it('returns a single product by slug or 404', async () => {
    const { app, db } = makeApp()
    const id = createProduct(db, { name: 'غلاية كهربائية', priceCents: 54900, stock: 9, category: 'منزل' })
    const slug = one<{ slug: string }>(db, 'SELECT slug FROM products WHERE id = ?', id)!.slug

    const ok = await request(app).get(`/api/products/${encodeURIComponent(slug)}`).expect(200)
    expect(ok.body.name).toBe('غلاية كهربائية')
    expect(ok.body.priceCents).toBe(54900)
    expect(ok.body.stock).toBe(9)

    await request(app).get('/api/products/does-not-exist').expect(404)
  })
})

describe('auth API', () => {
  it('registers, reveals the session, logs out', async () => {
    const { app } = makeApp()
    const agent = request.agent(app)

    const reg = await agent
      .post('/api/auth/register')
      .send({ name: 'سارة', email: 'sara@test.local', password: 'secret12' })
      .expect(201)
    expect(reg.body.user.role).toBe('customer')

    const me = await agent.get('/api/auth/me').expect(200)
    expect(me.body.user.email).toBe('sara@test.local')

    await agent.post('/api/auth/logout').expect(200)
    const after = await agent.get('/api/auth/me').expect(200)
    expect(after.body.user).toBeNull()
  })

  it('rejects duplicate registration and bad input', async () => {
    const { app, db } = makeApp()
    createUser(db, { email: 'taken@test.local', password: 'secret12' })

    await request(app)
      .post('/api/auth/register')
      .send({ name: 'آخر', email: 'taken@test.local', password: 'secret12' })
      .expect(409)

    await request(app)
      .post('/api/auth/register')
      .send({ name: 'أ', email: 'not-an-email', password: 'secret12' })
      .expect(422)
  })

  it('logs in with correct credentials only', async () => {
    const { app, db } = makeApp()
    createUser(db, { email: 'user@test.local', password: 'secret12' })

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.local', password: 'wrong-pass' })
      .expect(401)
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.local', password: 'secret12' })
      .expect(401)

    const ok = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.local', password: 'secret12' })
      .expect(200)
    expect(ok.body.user.email).toBe('user@test.local')
  })
})

describe('checkout API', () => {
  const customer = { name: 'أحمد سالم', phone: '01001234567', address: 'القاهرة - مدينة نصر - شارع النحاس 12' }

  function payment() {
    return { number: '4242 4242 4242 4242', exp: futureExpiry(), cvc: '123' }
  }

  it('creates an order, totals come from DB prices and stock is decremented', async () => {
    const { app, db } = makeApp()
    const a = createProduct(db, { name: 'منتج أ', priceCents: 129900, stock: 10 })
    const b = createProduct(db, { name: 'منتج ب', priceCents: 5000, stock: 3 })

    const res = await request(app)
      .post('/api/orders')
      .send({
        // A hostile client sends a fake price; the server must ignore it.
        items: [
          { productId: a, qty: 2, priceCents: 1 },
          { productId: b, qty: 1 },
        ],
        customer,
        payment: payment(),
      })
      .expect(201)

    expect(res.body.status).toBe('paid')
    expect(res.body.totalCents).toBe(129900 * 2 + 5000)
    expect(res.body.items).toHaveLength(2)

    expect(one<{ stock: number }>(db, 'SELECT stock FROM products WHERE id = ?', a)?.stock).toBe(8)
    expect(one<{ stock: number }>(db, 'SELECT stock FROM products WHERE id = ?', b)?.stock).toBe(2)

    const orders = one<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM orders')?.c
    expect(orders).toBe(1)
  })

  it('merges duplicate product lines', async () => {
    const { app, db } = makeApp()
    const a = createProduct(db, { name: 'منتج مكرر', priceCents: 1000, stock: 10 })
    const res = await request(app)
      .post('/api/orders')
      .send({
        items: [
          { productId: a, qty: 2 },
          { productId: a, qty: 3 },
        ],
        customer,
        payment: payment(),
      })
      .expect(201)
    expect(res.body.items).toHaveLength(1)
    expect(res.body.items[0].qty).toBe(5)
    expect(res.body.totalCents).toBe(5000)
    expect(one<{ stock: number }>(db, 'SELECT stock FROM products WHERE id = ?', a)?.stock).toBe(5)
  })

  it('rejects insufficient stock without changing anything', async () => {
    const { app, db } = makeApp()
    const a = createProduct(db, { name: 'نادر', priceCents: 1000, stock: 1 })

    const res = await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: a, qty: 2 }], customer, payment: payment() })
      .expect(409)
    expect(res.body.error).toContain('غير متوفرة')
    expect(one<{ stock: number }>(db, 'SELECT stock FROM products WHERE id = ?', a)?.stock).toBe(1)
    expect(one<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM orders')?.c).toBe(0)
  })

  it('rejects inactive and unknown products', async () => {
    const { app, db } = makeApp()
    const hidden = createProduct(db, { name: 'مخفي', priceCents: 1000, stock: 5, active: false })
    await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: hidden, qty: 1 }], customer, payment: payment() })
      .expect(404)
    await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: 999999, qty: 1 }], customer, payment: payment() })
      .expect(404)
  })

  it('validates payment data', async () => {
    const { app, db } = makeApp()
    const a = createProduct(db, { name: 'مرتفع', priceCents: 1000, stock: 5 })

    const badCard = await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: a, qty: 1 }], customer, payment: { number: '1234 5678 9012 3456', exp: futureExpiry(), cvc: '123' } })
      .expect(422)
    expect(badCard.body.error).toContain('البطاقة')

    const declined = await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: a, qty: 1 }], customer, payment: { number: declinedCard(), exp: futureExpiry(), cvc: '123' } })
      .expect(402)
    expect(declined.body.error).toContain('رفض')

    await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: a, qty: 1 }], customer, payment: { number: '4242 4242 4242 4242', exp: '01/20', cvc: '123' } })
      .expect(422)

    await request(app)
      .post('/api/orders')
      .send({ items: [], customer, payment: payment() })
      .expect(400)

    await request(app)
      .post('/api/orders')
      .send({
        items: [{ productId: a, qty: 1 }],
        customer: { ...customer, phone: 'NOT-A-PHONE' },
        payment: payment(),
      })
      .expect(422)

    // Nothing went through.
    expect(one<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM orders')?.c).toBe(0)
  })

  it('keeps an order history per customer (/my/orders)', async () => {
    const { app, db } = makeApp()
    const pid = createProduct(db, { name: 'منتج دفتر', priceCents: 3000, stock: 50 })

    // Guests get 401.
    await request(app).get('/api/my/orders').expect(401)

    const alice = request.agent(app)
    await alice
      .post('/api/auth/register')
      .send({ name: 'أليس', email: 'alice@test.local', password: 'secret12' })
      .expect(201)
    const aliceOrder = await alice
      .post('/api/orders')
      .send({ items: [{ productId: pid, qty: 1 }], customer, payment: payment() })
      .expect(201)

    const bob = request.agent(app)
    await bob
      .post('/api/auth/register')
      .send({ name: 'bob', email: 'bob@test.local', password: 'secret12' })
      .expect(201)
    const bobOrder = await bob
      .post('/api/orders')
      .send({ items: [{ productId: pid, qty: 2 }], customer, payment: payment() })
      .expect(201)

    const aliceHistory = await alice.get('/api/my/orders').expect(200)
    expect(aliceHistory.body.items).toHaveLength(1)
    expect(aliceHistory.body.items[0].id).toBe(aliceOrder.body.id)
    expect(aliceHistory.body.items[0].items[0].qty).toBe(1)

    const bobHistory = await bob.get('/api/my/orders').expect(200)
    expect(bobHistory.body.items).toHaveLength(1)
    expect(bobHistory.body.items[0].id).toBe(bobOrder.body.id)

    // Guest checkout orders have no owner and never appear in history.
    await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: pid, qty: 3 }], customer, payment: payment() })
      .expect(201)
    const after = await alice.get('/api/my/orders').expect(200)
    expect(after.body.items).toHaveLength(1)
  })

  it('lets an owner read their order but blocks strangers', async () => {
    const { app, db } = makeApp()
    const a = createProduct(db, { name: 'منتج', priceCents: 1000, stock: 5 })
    const owner = request.agent(app)
    await owner
      .post('/api/auth/register')
      .send({ name: 'مالك الطلب', email: 'owner@test.local', password: 'secret12' })
      .expect(201)

    const created = await owner
      .post('/api/orders')
      .send({ items: [{ productId: a, qty: 1 }], customer, payment: payment() })
      .expect(201)

    const mine = await owner.get(`/api/orders/${created.body.id}`).expect(200)
    expect(mine.body.totalCents).toBe(1000)

    await request(app).get(`/api/orders/${created.body.id}`).expect(403)

    createUser(db, { email: 'thief@test.local', password: 'secret12' })
    const thief = request.agent(app)
    await thief.post('/api/auth/login').send({ email: 'thief@test.local', password: 'secret12' }).expect(200)
    await thief.get(`/api/orders/${created.body.id}`).expect(403)
  })
})
