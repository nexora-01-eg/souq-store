import express from 'express'
import type { Router } from 'express'
import type { DatabaseSync } from 'node:sqlite'
import { all, one, type SqlParam } from '../db'
import { HttpError } from '../logic'

export interface ProductRow {
  id: number
  slug: string
  name: string
  description: string
  category: string
  price_cents: number
  stock: number
  emoji: string
  color: string
  active: number
  created_at: string
}

export interface ProductDto {
  id: number
  slug: string
  name: string
  description: string
  category: string
  priceCents: number
  stock: number
  emoji: string
  color: string
  active: boolean
}

export function toProduct(p: ProductRow): ProductDto {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    category: p.category,
    priceCents: p.price_cents,
    stock: p.stock,
    emoji: p.emoji,
    color: p.color,
    active: p.active === 1,
  }
}

function qstr(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t ? t : undefined
}

function qnum(v: unknown): number | null {
  const s = qstr(v)
  if (s === undefined) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

const SORTS: Record<string, string> = {
  newest: 'id DESC',
  price_asc: 'price_cents ASC',
  price_desc: 'price_cents DESC',
  name: 'name ASC',
}

export function productsRoutes(db: DatabaseSync): Router {
  const r = express.Router()

  r.get('/products', (req, res) => {
    const search = qstr(req.query.search)
    const category = qstr(req.query.category)
    const min = qnum(req.query.min)
    const max = qnum(req.query.max)
    const sortKey = qstr(req.query.sort) ?? 'newest'
    const orderSql = SORTS[sortKey] ?? SORTS.newest
    const page = Math.max(1, Math.floor(qnum(req.query.page) ?? 1))
    const perPage = Math.min(48, Math.max(6, Math.floor(qnum(req.query.perPage) ?? 12)))

    const where: string[] = ['active = 1']
    const params: SqlParam[] = []
    if (search) {
      where.push('(name LIKE ? OR description LIKE ?)')
      params.push(`%${search}%`, `%${search}%`)
    }
    if (category) {
      where.push('category = ?')
      params.push(category)
    }
    if (min !== null) {
      where.push('price_cents >= ?')
      params.push(Math.round(min))
    }
    if (max !== null) {
      where.push('price_cents <= ?')
      params.push(Math.round(max))
    }
    const whereSql = where.join(' AND ')

    const total = one<{ c: number }>(db, `SELECT COUNT(*) AS c FROM products WHERE ${whereSql}`, ...params)?.c ?? 0
    const items = all<ProductRow>(
      db,
      `SELECT * FROM products WHERE ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`,
      ...params,
      perPage,
      (page - 1) * perPage,
    )
    const categories = all<{ category: string; count: number }>(
      db,
      'SELECT category, COUNT(*) AS count FROM products WHERE active = 1 GROUP BY category ORDER BY count DESC',
    )

    res.json({
      items: items.map(toProduct),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / perPage)),
      categories,
    })
  })

  r.get('/products/:slug', (req, res) => {
    const slug = qstr(req.params.slug)
    if (!slug) throw new HttpError(404, 'المنتج غير موجود')
    const row = one<ProductRow>(db, 'SELECT * FROM products WHERE slug = ? AND active = 1', slug)
    if (!row) throw new HttpError(404, 'المنتج غير موجود')
    res.json(toProduct(row))
  })

  return r
}
