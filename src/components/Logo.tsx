import { BRAND } from '../../shared/brand'

/**
 * ATLAS monogram — a geometric "A" that doubles as a mountain ridge (the brand
 * is named after Atlas after all). Pure vector so it stays sharp anywhere, with
 * the breathing room baked into the viewBox (#1, #2, #3).
 */

const PEAK = 'M32 12 L53 52 H45 L39.5 44 H24.5 L19 52 H11 Z M32 24 L26 38 H38 Z'

let uid = 0

interface MarkProps {
  size?: number
  className?: string
  radius?: number
}

/** #1 the standalone mark. */
export function LogoMark({ size = 40, className = '', radius = 26 }: MarkProps) {
  const id = `atlas-mark-${(uid = (uid + 1) % 100000)}`
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`${BRAND.name} ${BRAND.latin}`}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7946e5" />
          <stop offset="50%" stopColor="#ac3aed" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx={radius} fill={`url(#${id})`} />
      <path d={PEAK} fill="#fff" fillRule="evenodd" />
      <path d="M11 52 H53" stroke="rgba(255,255,255,.45)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

/** #2 horizontal lockup: mark + Arabic name + tracked latin. */
export function LogoHorizontal({ markSize = 40, className = '' }: { markSize?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={markSize} className="shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="text-gradient font-display text-xl font-extrabold">{BRAND.name}</span>
        <span className="latin mt-1 text-[9px] font-bold text-slate-400">{BRAND.latin}</span>
      </span>
    </span>
  )
}

/** #2 stacked lockup for the footer / empty states. */
export function LogoStacked({ markSize = 56, className = '' }: { markSize?: number; className?: string }) {
  return (
    <span className={`inline-flex flex-col items-center gap-3 ${className}`}>
      <LogoMark size={markSize} radius={18} />
      <span className="flex flex-col items-center leading-none">
        <span className="text-gradient font-display text-2xl font-extrabold">{BRAND.name}</span>
        <span className="latin mt-1.5 text-[10px] font-bold text-slate-400">{BRAND.latin}</span>
      </span>
    </span>
  )
}

/** #6 — the rotating "since 2015" wax seal. */
export function LogoSeal({ size = 108, className = '' }: { size?: number; className?: string }) {
  const id = `atlas-seal-${(uid = (uid + 1) % 100000)}`
  return (
    <span className={`relative inline-grid place-items-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} className="seal absolute inset-0" aria-hidden>
        <defs>
          <path id={id} d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
        </defs>
        <text
          fill="currentColor"
          fontSize="10.5"
          fontWeight="700"
          letterSpacing="3"
          fontFamily="'Space Grotesk', sans-serif"
        >
          <textPath href={`#${id}`} startOffset="0%">
            ATLAS • SINCE {BRAND.since} • CAIRO • EGYPT •
          </textPath>
        </text>
      </svg>
      <LogoMark size={size * 0.52} radius={16} />
    </span>
  )
}
