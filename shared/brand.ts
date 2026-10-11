/** Brand identity — single source used by both server and client. */
export const BRAND = {
  name: 'أطلس',
  latin: 'ATLAS',
  legal: 'أطلس للتجارة الإلكترونية',
  tagline: 'كل اللي محتاجه — براند واحد تثق بيه',
  shortTagline: 'براند مصري بمعايير عالمية',
  since: 2015,
  domain: 'atlas.eg',
  email: 'care@atlas.eg',
  hotline: '16000',
  address: 'القاهرة، التجمع الخامس، برج أطلس، الدور 12',
  hours: 'يوميًا من 9 صباحًا حتى 10 مساءً (الجمعة 2 ظهرًا - 10 مساءً)',
  social: {
    facebook: 'https://facebook.com/atlas.eg',
    instagram: 'https://instagram.com/atlas.eg',
    x: 'https://x.com/atlas_eg',
    youtube: 'https://youtube.com/@atlas_eg',
  },
} as const

export type Brand = typeof BRAND
