export const CURRENCY = 'ج.م'

export function formatEgp(cents: number): string {
  return `${formatAmount(cents)} ${CURRENCY}`
}

/** #27 — the number on its own so the currency mark can be set smaller. */
export function formatAmount(cents: number): string {
  const value = cents / 100
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatInt(n: number): string {
  return n.toLocaleString('en-US')
}

export function egpToCents(value: string): number | null {
  const s = String(value).trim()
  if (!s) return null
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

export function centsToEgp(cents: number): string {
  return String(cents / 100)
}
