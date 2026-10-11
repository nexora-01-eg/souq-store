import { describe, expect, it } from 'vitest'
import { all, initSchema, one, openDb, seedDemo } from '../server/db'
import { CATALOG_TARGET } from '../server/catalog'

function freshDb() {
  const db = openDb(':memory:')
  initSchema(db)
  seedDemo(db)
  return db
}

describe('brand catalog seeding', () => {
  it('fills the catalog to the full 1200-product lineup across categories', () => {
    const db = freshDb()
    const total = one<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM products')?.c ?? 0
    expect(total).toBe(CATALOG_TARGET)
    expect(total).toBeGreaterThanOrEqual(1000)

    const cats = all<{ category: string; count: number }>(
      db,
      'SELECT category, COUNT(*) AS count FROM products GROUP BY category ORDER BY count DESC',
    )
    expect(cats.length).toBeGreaterThanOrEqual(6)
    for (const c of cats) expect(c.count).toBeGreaterThanOrEqual(100)
  })

  it('keeps every slug unique and every value sane', () => {
    const db = freshDb()
    const total = one<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM products')?.c ?? 0
    const distinctSlugs = one<{ c: number }>(db, 'SELECT COUNT(DISTINCT slug) AS c FROM products')?.c ?? 0
    expect(distinctSlugs).toBe(total)

    const invalid = one<{ c: number }>(
      db,
      'SELECT COUNT(*) AS c FROM products WHERE price_cents <= 0 OR stock < 0 OR length(name) < 4',
    )?.c
    expect(invalid).toBe(0)

    // Generated lineup carries the brand name (first 24 are the curated showcase).
    const unbranded = one<{ c: number }>(
      db,
      "SELECT COUNT(*) AS c FROM products WHERE id > 24 AND name NOT LIKE 'أطلس %'",
    )?.c
    expect(unbranded).toBe(0)
  })

  it('is idempotent — re-seeding adds nothing', () => {
    const db = freshDb()
    const before = one<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM products')?.c
    const ordersBefore = one<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM orders')?.c
    seedDemo(db)
    seedDemo(db)
    expect(one<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM products')?.c).toBe(before)
    expect(one<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM orders')?.c).toBe(ordersBefore)
  })

  it('keeps demo accounts and historical orders', () => {
    const db = freshDb()
    expect(one<{ c: number }>(db, 'SELECT COUNT(*) AS c FROM orders')?.c ?? 0).toBeGreaterThanOrEqual(40)
    expect(one(db, "SELECT id FROM users WHERE email = 'admin@demo.local'")).toBeTruthy()
    expect(one(db, "SELECT id FROM users WHERE email = 'customer@demo.local'")).toBeTruthy()
  })
})
