import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { loadUser } from './auth'
import { HttpError } from './logic'
import { productsRoutes } from './routes/products'
import { authRoutes } from './routes/auth'
import { ordersRoutes } from './routes/orders'
import { adminRoutes } from './routes/admin'

export function createApp(db: DatabaseSync): express.Express {
  const app = express()
  app.disable('x-powered-by')

  app.use(express.json({ limit: '256kb' }))
  app.use((req, _res, next) => {
    req.user = loadUser(db, req)
    next()
  })

  const api = express.Router()
  api.get('/health', (_req, res) => {
    res.json({ ok: true })
  })
  api.use(productsRoutes(db))
  api.use(authRoutes(db))
  api.use(ordersRoutes(db))
  api.use(adminRoutes(db))
  api.use((_req, res) => {
    res.status(404).json({ error: 'المسار غير موجود' })
  })
  app.use('/api', api)

  // Serve the built client when it exists (production mode).
  const distDir = path.resolve(process.cwd(), 'dist')
  if (fs.existsSync(path.join(distDir, 'index.html'))) {
    app.use(express.static(distDir))
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
      res.sendFile(path.join(distDir, 'index.html'))
    })
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message })
      return
    }
    const e = err as { status?: number; type?: string }
    if (e?.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'JSON غير صالح' })
      return
    }
    if (typeof e?.status === 'number' && e.status >= 400 && e.status < 500) {
      res.status(e.status).json({ error: 'طلب غير صالح' })
      return
    }
    console.error(err)
    res.status(500).json({ error: 'خطأ غير متوقع في الخادم' })
  })

  return app
}
