/**
 * #7  every category gets a single-weight line icon instead of an emoji.
 * #17 every category gets its own identity colour, used for chips, card
 *     accents, filters and the dashboard.
 */

export interface CategoryStyle {
  color: string
  soft: string
  icon: string
}

const STYLES: Record<string, CategoryStyle> = {
  'إلكترونيات': {
    color: '#7946e5',
    soft: 'rgba(121,70,229,.14)',
    icon: 'M4 13a8 8 0 0 1 16 0M4 13v4a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 2Zm16 0v4a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2Z',
  },
  'أزياء': {
    color: '#db2777',
    soft: 'rgba(219,39,119,.14)',
    icon: 'M8 4 4 6.5l2 3 2-1.2V20h8V8.3l2 1.2 2-3L16 4l-2 2h-4L8 4Z',
  },
  'منزل ومطبخ': {
    color: '#059669',
    soft: 'rgba(5,150,105,.14)',
    icon: 'M3.5 11 12 4l8.5 7M5.5 10v9a1 1 0 0 0 1 1H10v-5h4v5h3.5a1 1 0 0 0 1-1v-9',
  },
  'رياضة': {
    color: '#ea580c',
    soft: 'rgba(234,88,12,.14)',
    icon: 'M4 9.5v5M7 7v10M17 7v10M20 9.5v5M7 12h10',
  },
  'جمال': {
    color: '#c433ea',
    soft: 'rgba(196,51,234,.14)',
    icon: 'M12 3.5l2.1 4.6 4.9.6-3.6 3.4.9 4.9L12 14.7l-4.3 2.3.9-4.9L5 8.7l4.9-.6L12 3.5Z',
  },
  'كتب': {
    color: '#02b2c7',
    soft: 'rgba(2,178,199,.14)',
    icon: 'M4.5 5.5A2.5 2.5 0 0 1 7 3h12.5v14H7a2.5 2.5 0 0 0-2.5 2.5V5.5ZM7 17h12.5v3.5H7',
  },
  'ألعاب': {
    color: '#e11d48',
    soft: 'rgba(225,29,72,.14)',
    icon: 'M7.5 7h9a5 5 0 0 1 0 10h-9a5 5 0 0 1 0-10ZM9 10.5v3M7.5 12h3M15.5 11h.01M17.5 13.5h.01',
  },
  'مستلزمات أطفال': {
    color: '#d97706',
    soft: 'rgba(217,119,6,.14)',
    icon: 'M12 4l2.2 4.5 4.9.7-3.5 3.4.8 4.9L12 15.2 7.6 17.5l.8-4.9-3.5-3.4 4.9-.7L12 4Z',
  },
}

const FALLBACK: CategoryStyle = { color: '#8663f1', soft: 'rgba(134,99,241,.14)', icon: 'M12 4l8 15H4l8-15Z' }

/** Stable identity colour/icon for a category (falls back to the brand hue). */
export function categoryStyle(category: string): CategoryStyle {
  return STYLES[category] ?? FALLBACK
}

/** Deterministic colour for a product, keyed off its category + slug colour. */
export function tint(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const r = parseInt(full.slice(0, 2), 16) || 0
  const g = parseInt(full.slice(2, 4), 16) || 0
  const b = parseInt(full.slice(4, 6), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
