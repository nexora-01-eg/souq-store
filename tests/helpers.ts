import type { DatabaseSync } from 'node:sqlite'
import { initSchema, openDb, runId } from '../server/db'
import { createApp } from '../server/app'
import { hashPassword } from '../server/auth'
import { luhnValid } from '../server/logic'

export function makeApp() {
  const db = openDb(':memory:')
  initSchema(db)
  return { app: createApp(db), db }
}

export function createUser(
  db: DatabaseSync,
  opts: { email: string; name?: string; password: string; role?: 'customer' | 'admin' },
): number {
  const { salt, hash } = hashPassword(opts.password)
  return runId(
    db,
    'INSERT INTO users (email, name, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)',
    opts.email,
    opts.name ?? 'مستخدم اختبار',
    hash,
    salt,
    opts.role ?? 'customer',
  )
}

export function createProduct(
  db: DatabaseSync,
  opts: {
    name: string
    priceCents: number
    stock: number
    category?: string
    active?: boolean
    description?: string
    emoji?: string
    color?: string
  },
): number {
  const base =
    opts.name
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase() || 'p'
  const slug = `${base}-${Math.random().toString(36).slice(2, 8)}`
  return runId(
    db,
    'INSERT INTO products (slug, name, description, category, price_cents, stock, emoji, color, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    slug,
    opts.name,
    opts.description ?? 'وصف تجريبي للاختبارات',
    opts.category ?? 'إلكترونيات',
    opts.priceCents,
    opts.stock,
    opts.emoji ?? '🎧',
    opts.color ?? '#7946e5',
    opts.active === false ? 0 : 1,
  )
}

/** Expiry date a few years in the future, formatted MM/YY. */
export function futureExpiry(): string {
  const now = new Date()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const year = String((now.getUTCFullYear() + 3) % 100).padStart(2, '0')
  return `${month}/${year}`
}

/** A Luhn-valid 16-digit card that ends in 0002 (declined by the demo rule). */
export function declinedCard(): string {
  for (let i = 0; i < 200000; i++) {
    const candidate = `${String(i).padStart(12, '0')}0002`
    if (luhnValid(candidate)) return candidate
  }
  throw new Error('no declined card found')
}
