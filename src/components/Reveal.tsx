import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  /** milliseconds of delay — use index * 90 for a stagger. */
  delay?: number
  className?: string
  as?: ElementType
}

/**
 * #87 — reveal-on-scroll with an optional per-item stagger.
 * Falls back to "visible" immediately when IntersectionObserver is missing or
 * the visitor asked for reduced motion, so nothing is ever stuck invisible.
 */
export default function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            io.disconnect()
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])

  const Comp = Tag as ElementType<{
    ref?: React.Ref<HTMLElement>
    className?: string
    style?: React.CSSProperties
    children?: ReactNode
  }>

  return (
    <Comp
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ '--delay': `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Comp>
  )
}
