import { useEffect, useState } from 'react'

const COLORS = ['#7946e5', '#ac3aed', '#db2777', '#f59e0b', '#06d4c2', '#10b981', '#f43f5e']

/** #92 — a short confetti burst when an order is confirmed. */
export default function Confetti({ count = 64 }: { count?: number }) {
  const [on, setOn] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setOn(false)
      return
    }
    const t = window.setTimeout(() => setOn(false), 3400)
    return () => window.clearTimeout(t)
  }, [])

  if (!on) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const size = 7 + (i % 5) * 3
        return (
          <span
            key={i}
            style={
              {
                position: 'absolute',
                top: '-16px',
                left: `${(i * 37) % 100}%`,
                width: size,
                height: i % 3 === 0 ? size : size * 1.8,
                borderRadius: i % 3 === 0 ? '999px' : '2px',
                background: COLORS[i % COLORS.length],
                '--dx': `${((i * 53) % 160) - 80}px`,
                animation: `confetti-fall ${2000 + (i % 7) * 280}ms cubic-bezier(.3,.65,.6,1) ${(i % 22) * 70}ms forwards`,
              } as React.CSSProperties
            }
          />
        )
      })}
    </div>
  )
}
