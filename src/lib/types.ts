export interface Product {
  id: number
  slug: string
  name: string
  description: string
  category: string
  priceCents: number
  stock: number
  emoji: string
  color: string
  active: boolean
}

export interface ProductWithSold extends Product {
  sold: number
}

export interface User {
  id: number
  email: string
  name: string
  role: 'customer' | 'admin'
}

export interface CartItem {
  id: number
  slug: string
  name: string
  priceCents: number
  emoji: string
  color: string
  stock: number
  qty: number
}

export interface OrderItem {
  productId: number
  name: string
  priceCents: number
  qty: number
}

export type OrderStatus = 'paid' | 'shipped' | 'cancelled'

export interface Order {
  id: number
  customerName: string
  phone: string
  address: string
  totalCents: number
  status: OrderStatus
  createdAt: string
  items: OrderItem[]
}

export interface AdminOrder extends Order {
  userEmail: string | null
}

export interface CategoryInfo {
  category: string
  count: number
}

export interface ProductsResponse {
  items: Product[]
  total: number
  page: number
  pages: number
  categories: CategoryInfo[]
}

export interface Reports {
  days: number
  kpis: {
    revenueCents: number
    paidOrders: number
    allOrders: number
    unitsSold: number
    avgOrderCents: number
    lowStockCount: number
  }
  previous: { revenueCents: number; paidOrders: number }
  trends: { revenuePct: number | null; ordersPct: number | null }
  series: { day: string; revenueCents: number; orders: number }[]
  topProducts: { name: string; emoji: string; qty: number; revenueCents: number }[]
  lowStock: { id: number; name: string; stock: number; emoji: string; category: string }[]
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  paid: 'مدفوع',
  shipped: 'تم الشحن',
  cancelled: 'ملغي',
}
