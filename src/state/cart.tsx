import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CartItem, Product } from '../lib/types'

const STORAGE_KEY = 'souq-cart-v1'
const MAX_QTY = 99

interface CartContextValue {
  items: CartItem[]
  count: number
  totalCents: number
  add: (product: Product, qty?: number) => void
  setQty: (id: number, qty: number) => void
  remove: (id: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function loadItems(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (i): i is CartItem =>
        !!i &&
        typeof i === 'object' &&
        typeof (i as CartItem).id === 'number' &&
        typeof (i as CartItem).name === 'string' &&
        typeof (i as CartItem).priceCents === 'number',
    )
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadItems)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const add = useCallback((product: Product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id)
      if (existing) {
        const nextQty = Math.min(existing.qty + qty, product.stock, MAX_QTY)
        if (nextQty <= existing.qty) return prev
        return prev.map((i) => (i.id === product.id ? { ...i, qty: nextQty } : i))
      }
      const qtyToAdd = Math.min(qty, product.stock, MAX_QTY)
      if (qtyToAdd <= 0) return prev
      return [
        ...prev,
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          priceCents: product.priceCents,
          emoji: product.emoji,
          color: product.color,
          stock: product.stock,
          qty: qtyToAdd,
        },
      ]
    })
  }, [])

  const setQty = useCallback((id: number, qty: number) => {
    setItems((prev) =>
      prev.flatMap((i) => {
        if (i.id !== id) return [i]
        const next = Math.min(Math.max(1, qty), i.stock, MAX_QTY)
        return [{ ...i, qty: next }]
      }),
    )
  }, [])

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items])
  const totalCents = useMemo(() => items.reduce((s, i) => s + i.qty * i.priceCents, 0), [items])

  const value = useMemo(
    () => ({ items, count, totalCents, add, setQty, remove, clear }),
    [items, count, totalCents, add, setQty, remove, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
