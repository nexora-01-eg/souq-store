interface ProductVisualProps {
  emoji: string
  color: string
  className?: string
  emojiClass?: string
  /** gradient angle — gives each gallery "shot" its own lighting. */
  angle?: number
}

/** #49 — one consistent stage per product with a light sweep and zoom on hover. */
export default function ProductVisual({
  emoji,
  color,
  className = '',
  emojiClass = 'text-6xl',
  angle = 135,
}: ProductVisualProps) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(${angle}deg, ${color} 0%, color-mix(in srgb, ${color} 45%, #0f172a) 100%)`,
      }}
    >
      <span aria-hidden className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-white/10" />
      <span aria-hidden className="absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-white/10" />
      {/* sweeping highlight */}
      <span
        aria-hidden
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
      />
      <span
        className={`relative drop-shadow-lg transition-transform duration-500 ease-out group-hover:scale-125 ${emojiClass}`}
      >
        {emoji}
      </span>
    </div>
  )
}
