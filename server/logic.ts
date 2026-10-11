export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Turn a product name into a URL slug, keeping Arabic letters. */
export function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-]+|[-]+$/g, '')
  if (base) return base
  return `p-${Math.random().toString(36).slice(2, 8)}`
}

export function cardDigits(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/[\s-]/g, '') : ''
}

/** Luhn checksum with a 13–19 digit length check. */
export function luhnValid(raw: unknown): boolean {
  const digits = cardDigits(raw)
  if (!/^\d{13,19}$/.test(digits)) return false
  let sum = 0
  let alternate = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48
    if (alternate) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alternate = !alternate
  }
  return sum % 10 === 0
}

/** Expiry must be MM/YY and not before the current month. */
export function expiryValid(raw: unknown): boolean {
  if (typeof raw !== 'string') return false
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(raw.trim())
  if (!m) return false
  const month = Number(m[1])
  const year = 2000 + Number(m[2])
  if (month < 1 || month > 12) return false
  const now = new Date()
  const endOfMonth = new Date(Date.UTC(year, month, 1))
  return endOfMonth.getTime() > now.getTime()
}

export function cvcValid(raw: unknown): boolean {
  return typeof raw === 'string' && /^\d{3,4}$/.test(raw.trim())
}

/** Demo rule: test card numbers ending in 0002 get declined. */
export function isTestDecline(raw: unknown): boolean {
  return cardDigits(raw).endsWith('0002')
}

export function requireText(value: unknown, min: number, max: number, label: string): string {
  if (typeof value !== 'string') throw new HttpError(422, `${label} غير صالح`)
  const trimmed = value.trim()
  if (trimmed.length < min || trimmed.length > max) throw new HttpError(422, `${label} غير صالح`)
  return trimmed
}

export function requireInt(value: unknown, min: number, max: number, label: string): number {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : NaN
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(422, `${label} غير صالح`)
  return n
}
