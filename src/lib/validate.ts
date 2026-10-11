export function cardDigits(raw: string): string {
  return raw.replace(/[\s-]/g, '')
}

export function luhnValid(raw: string): boolean {
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

export function expiryValid(raw: string): boolean {
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(raw.trim())
  if (!m) return false
  const month = Number(m[1])
  const year = 2000 + Number(m[2])
  if (month < 1 || month > 12) return false
  return new Date(Date.UTC(year, month, 1)).getTime() > Date.now()
}

export function cvcValid(raw: string): boolean {
  return /^\d{3,4}$/.test(raw.trim())
}

export function phoneValid(raw: string): boolean {
  return /^[0-9+\-\s]{8,20}$/.test(raw.trim())
}

export function formatCardInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 19)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export function formatExpiryInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}
