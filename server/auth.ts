import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'
import type { DatabaseSync } from 'node:sqlite'
import { one, run } from './db'

export interface AuthUser {
  id: number
  email: string
  name: string
  role: 'customer' | 'admin'
}

export const SESSION_COOKIE = 'sid'
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString('hex')
  return { salt, hash: scryptSync(password, salt, 64).toString('hex') }
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const actual = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx < 0) continue
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (key) out[key] = decodeURIComponent(value)
  }
  return out
}

function setSessionCookie(res: Response, token: string, maxAgeMs: number): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(maxAgeMs / 1000)}`,
  )
}

export function createSession(db: DatabaseSync, userId: number, res: Response): void {
  const token = randomBytes(32).toString('hex')
  run(
    db,
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
    token,
    userId,
    Date.now() + SESSION_TTL_MS,
  )
  setSessionCookie(res, token, SESSION_TTL_MS)
}

export function destroySession(db: DatabaseSync, req: Request, res: Response): void {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE]
  if (token) run(db, 'DELETE FROM sessions WHERE token = ?', token)
  setSessionCookie(res, '', 0)
}

export function loadUser(db: DatabaseSync, req: Request): AuthUser | undefined {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE]
  if (!token) return undefined
  return one<AuthUser>(
    db,
    `SELECT u.id AS id, u.email AS email, u.name AS name, u.role AS role
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
    token,
    Date.now(),
  )
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' })
    return
  }
  next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' })
    return
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'هذا القسم لمدير المتجر فقط' })
    return
  }
  next()
}
