import express from 'express'
import type { Router } from 'express'
import type { DatabaseSync } from 'node:sqlite'
import { one, runId } from '../db'
import { HttpError, requireText } from '../logic'
import { createSession, destroySession, hashPassword, verifyPassword, type AuthUser } from '../auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function requireEmail(value: unknown): string {
  const email = requireText(value, 5, 120, 'البريد الإلكتروني').toLowerCase()
  if (!EMAIL_RE.test(email)) throw new HttpError(422, 'البريد الإلكتروني غير صالح')
  return email
}

export function authRoutes(db: DatabaseSync): Router {
  const r = express.Router()

  r.post('/auth/register', (req, res) => {
    const name = requireText(req.body?.name, 2, 80, 'الاسم')
    const email = requireEmail(req.body?.email)
    const password = requireText(req.body?.password, 6, 100, 'كلمة المرور')

    if (one(db, 'SELECT id FROM users WHERE email = ?', email)) {
      throw new HttpError(409, 'هذا البريد الإلكتروني مسجل بالفعل')
    }
    const { salt, hash } = hashPassword(password)
    const id = runId(
      db,
      'INSERT INTO users (email, name, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)',
      email,
      name,
      hash,
      salt,
      'customer',
    )
    createSession(db, id, res)
    res.status(201).json({ user: { id, email, name, role: 'customer' } satisfies AuthUser })
  })

  r.post('/auth/login', (req, res) => {
    const email = requireEmail(req.body?.email)
    const password = requireText(req.body?.password, 1, 100, 'كلمة المرور')
    const user = one<{ id: number; email: string; name: string; role: 'customer' | 'admin'; salt: string; password_hash: string }>(
      db,
      'SELECT id, email, name, role, salt, password_hash FROM users WHERE email = ?',
      email,
    )
    if (!user || !verifyPassword(password, user.salt, user.password_hash)) {
      throw new HttpError(401, 'البريد الإلكتروني أو كلمة المرور غير صحيحة')
    }
    createSession(db, user.id, res)
    res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } satisfies AuthUser })
  })

  r.post('/auth/logout', (req, res) => {
    destroySession(db, req, res)
    res.json({ ok: true })
  })

  r.get('/auth/me', (req, res) => {
    res.json({ user: req.user ?? null })
  })

  return r
}
