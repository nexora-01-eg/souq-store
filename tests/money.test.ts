import { describe, expect, it } from 'vitest'
import { centsToEgp, egpToCents, formatEgp, formatInt } from '../src/lib/money'

describe('formatEgp', () => {
  it('formats cents as pounds with two decimals', () => {
    expect(formatEgp(129900)).toBe('1,299.00 ج.م')
    expect(formatEgp(0)).toBe('0.00 ج.م')
    expect(formatEgp(8907)).toBe('89.07 ج.م')
    expect(formatEgp(500)).toBe('5.00 ج.م')
  })
})

describe('egpToCents', () => {
  it('parses decimal input into integer cents', () => {
    expect(egpToCents('99.99')).toBe(9999)
    expect(egpToCents('100')).toBe(10000)
    expect(egpToCents(' 50.5 ')).toBe(5050)
  })

  it('rejects invalid or negative input', () => {
    expect(egpToCents('abc')).toBeNull()
    expect(egpToCents('-5')).toBeNull()
    expect(egpToCents('')).toBeNull()
  })
})

describe('centsToEgp', () => {
  it('round-trips with egpToCents', () => {
    expect(centsToEgp(129900)).toBe('1299')
    expect(egpToCents(centsToEgp(9999))).toBe(9999)
  })
})

describe('formatInt', () => {
  it('groups thousands', () => {
    expect(formatInt(1234567)).toBe('1,234,567')
    expect(formatInt(0)).toBe('0')
  })
})
