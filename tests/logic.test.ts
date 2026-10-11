import { describe, expect, it } from 'vitest'
import {
  HttpError,
  cvcValid,
  expiryValid,
  isTestDecline,
  luhnValid,
  requireInt,
  requireText,
  slugify,
} from '../server/logic'
import { declinedCard, futureExpiry } from './helpers'

describe('luhnValid', () => {
  it('accepts common test cards', () => {
    expect(luhnValid('4242 4242 4242 4242')).toBe(true)
    expect(luhnValid('4111111111111111')).toBe(true)
    expect(luhnValid('5555555555554444')).toBe(true)
    expect(luhnValid('6011111111111117')).toBe(true)
  })

  it('rejects bad checksums and bad shapes', () => {
    expect(luhnValid('4242 4242 4242 4241')).toBe(false)
    expect(luhnValid('1234567890123')).toBe(false)
    expect(luhnValid('424242')).toBe(false)
    expect(luhnValid('abcdefghij1234')).toBe(false)
    expect(luhnValid(null)).toBe(false)
    expect(luhnValid(4242424242424242)).toBe(false)
  })
})

describe('expiryValid', () => {
  it('accepts a future MM/YY', () => {
    expect(expiryValid(futureExpiry())).toBe(true)
  })

  it('rejects past dates, bad months and bad formats', () => {
    expect(expiryValid('01/20')).toBe(false)
    expect(expiryValid('13/30')).toBe(false)
    expect(expiryValid('1/30')).toBe(false)
    expect(expiryValid('abc')).toBe(false)
    expect(expiryValid(null)).toBe(false)
  })
})

describe('cvcValid', () => {
  it('accepts 3-4 digits only', () => {
    expect(cvcValid('123')).toBe(true)
    expect(cvcValid('1234')).toBe(true)
    expect(cvcValid('12')).toBe(false)
    expect(cvcValid('12a')).toBe(false)
  })
})

describe('isTestDecline', () => {
  it('flags cards ending in 0002', () => {
    expect(isTestDecline('4242 4242 4242 0002')).toBe(true)
    expect(isTestDecline(declinedCard())).toBe(true)
    expect(isTestDecline('4242 4242 4242 4242')).toBe(false)
  })
})

describe('slugify', () => {
  it('keeps Arabic letters and dashes spaces', () => {
    expect(slugify('سماعات بلوتوث لاسلكية')).toBe('سماعات-بلوتوث-لاسلكية')
    expect(slugify('  Hello   World!  ')).toBe('hello-world')
  })

  it('falls back to a random id for empty input', () => {
    expect(slugify('!!!')).toMatch(/^p-/)
  })
})

describe('requireText / requireInt', () => {
  it('returns trimmed text or throws HttpError', () => {
    expect(requireText('  سلامة  ', 2, 20, 'الاسم')).toBe('سلامة')
    expect(() => requireText('x', 2, 20, 'الاسم')).toThrowError(HttpError)
    expect(() => requireText(42, 1, 20, 'الاسم')).toThrowError(HttpError)
    expect(() => requireText('a'.repeat(50), 2, 20, 'الاسم')).toThrowError(HttpError)
  })

  it('validates integer ranges', () => {
    expect(requireInt('5', 1, 10, 'الكمية')).toBe(5)
    expect(requireInt(7, 1, 10, 'الكمية')).toBe(7)
    expect(() => requireInt(0, 1, 10, 'الكمية')).toThrowError(HttpError)
    expect(() => requireInt(1.5, 1, 10, 'الكمية')).toThrowError(HttpError)
    expect(() => requireInt('abc', 1, 10, 'الكمية')).toThrowError(HttpError)
  })
})
