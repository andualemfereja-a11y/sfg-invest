import { MS_PER_DAY } from './plans'

/** Format a number as ETB currency, e.g. "5,800.00 ETB". */
export function formatETB(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0
  return (
    value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' ETB'
  )
}

/** Format a daily profit rate (decimal) as a percentage string, e.g. "4.2%". */
export function formatRate(rate: number): string {
  return (
    (rate * 100).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }) + '%'
  )
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Human friendly remaining time, e.g. "8h 24m remaining". */
export function formatRemaining(untilTs: number, now = Date.now()): string {
  const diff = untilTs - now
  if (diff <= 0) return 'Ready to process'
  const hours = Math.floor(diff / (60 * 60 * 1000))
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000))
  return `${hours}h ${minutes}m remaining`
}

export function daysBetween(from: number, to: number): number {
  return Math.max(0, (to - from) / MS_PER_DAY)
}

/**
 * Normalize an Ethiopian phone number to a canonical internal form.
 * Accepts formats like 0912345678, +251912345678, 251912345678, 912345678.
 * Returns canonical "09XXXXXXXX" (10 digits) or null if invalid.
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null
  let digits = raw.replace(/[^\d+]/g, '')
  digits = digits.replace(/^\+/, '')
  if (digits.startsWith('251')) {
    digits = digits.slice(3)
  }
  // now expect either 9XXXXXXXX (9 digits) or 09XXXXXXXX (10)
  if (digits.length === 9 && (digits.startsWith('9') || digits.startsWith('7'))) {
    digits = '0' + digits
  }
  if (digits.length === 10 && digits.startsWith('0') && (digits[1] === '9' || digits[1] === '7')) {
    return digits
  }
  return null
}

/** Pretty display form: "+251 9XXXXXXXX". */
export function displayPhone(normalized: string): string {
  if (!normalized) return ''
  const local = normalized.replace(/^0/, '')
  return `+251 ${local}`
}
