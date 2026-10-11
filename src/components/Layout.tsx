import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BRAND } from '../../shared/brand'
import { api } from '../api'
import { categoryStyle } from '../lib/categories'
import { formatAmount } from '../lib/money'
import { getTheme, toggleTheme } from '../lib/theme'
import type { ProductsResponse } from '../lib/types'
import { useAuth } from '../state/auth'
import { useCart } from '../state/cart'
import { LogoHorizontal } from './Logo'

/* #101 — recent searches, persisted per browser. */
const RECENT_KEY = 'atlas-recent-searches'

function readRecents(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown[]
    return v.filter((x): x is string => typeof x === 'string').slice(0, 5)
  } catch {
    return []
  }
}

function rememberSearch(term: string): void {
  try {
    const t = term.trim()
    if (!t) return
    localStorage.setItem(RECENT_KEY, JSON.stringify([t, ...readRecents().filter((r) => r !== t)].slice(0, 5)))
  } catch {
    /* ignore */
  }
}

interface Suggestion {
  kind: 'category' | 'product' | 'recent'
  label: string
  slug?: string
  emoji?: string
  priceCents?: number
}

function SearchBox({ value, onChange, onSubmit, className = '', categories = [] }: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  className?: string
  categories?: string[]
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [active, setActive] = useState(-1)
  const [recents, setRecents] = useState<string[]>(() => readRecents())
  const wrapRef = useRef<HTMLDivElement | null>(null)

  /* debounced live suggestions (#101) */
  useEffect(() => {
    const q = value.trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    let cancelled = false
    const t = window.setTimeout(() => {
      api<ProductsResponse>(`/api/products?search=${encodeURIComponent(q)}&perPage=5`)
        .then((d) => {
          if (cancelled) return
          const catHits: Suggestion[] = categories
            .filter((c) => c.includes(q))
            .slice(0, 3)
            .map((c) => ({ kind: 'category', label: c }))
          const prodHits: Suggestion[] = d.items.slice(0, 5).map((p) => ({
            kind: 'product',
            label: p.name,
            slug: p.slug,
            emoji: p.emoji,
            priceCents: p.priceCents,
          }))
          setSuggestions([...catHits, ...prodHits])
        })
        .catch(() => {
          if (!cancelled) setSuggestions([])
        })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [value, categories])

  /* close when clicking outside (#101) */
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  function pick(s: Suggestion) {
    rememberSearch(value)
    setRecents(readRecents())
    setOpen(false)
    setActive(-1)
    if (s.kind === 'category') navigate(`/?category=${encodeURIComponent(s.label)}`)
    else if (s.kind === 'product' && s.slug) navigate(`/product/${encodeURIComponent(s.slug)}`)
  }

  function pickRecent(term: string) {
    onChange(term)
    rememberSearch(term)
    setRecents(readRecents())
    setOpen(false)
    setActive(-1)
    navigate(`/?search=${encodeURIComponent(term)}`)
  }

  function submit() {
    rememberSearch(value)
    setRecents(readRecents())
    setOpen(false)
    setActive(-1)
    onSubmit()
  }

  const list: Suggestion[] = value.trim()
    ? suggestions
    : recents.map((r) => ({ kind: 'recent' as const, label: r }))
  const showList = open && (list.length > 0 || (value.trim().length >= 2 && suggestions.length === 0))

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false)
      setActive(-1)
      return
    }
    if (!list.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => (a + 1) % list.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a <= 0 ? list.length - 1 : a - 1))
    } else if (e.key === 'Enter' && active >= 0 && active < list.length) {
      e.preventDefault()
      const s = list[active]
      if (s.kind === 'recent') pickRecent(s.label)
      else pick(s)
    }
  }

  return (
    <form
      className={`relative ${className}`}
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        if (active >= 0 && active < list.length) {
          const s = list[active]
          if (s.kind === 'recent') pickRecent(s.label)
          else pick(s)
          return
        }
        submit()
      }}
    >
      <input
        className="input ps-10"
        placeholder="ابحث عن منتج، فئة، أو وصف..."
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setActive(-1)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        aria-label="بحث"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
      />
      <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-slate-400">🔍</span>

      {showList && (
        <ul
          id="search-suggestions"
          role="listbox"
          aria-label="اقتراحات البحث"
          className="glass-strong pop absolute inset-x-0 top-full z-50 mt-2 max-h-80 overflow-auto rounded-2xl p-2 shadow-2xl"
        >
          {!value.trim() && recents.length > 0 && (
            <li className="flex items-center justify-between px-3 pb-1 pt-2">
              <span className="eyebrow">Recent</span>
              <button
                type="button"
                className="text-xs font-semibold text-rose-600 hover:underline"
                onClick={() => {
                  try {
                    localStorage.removeItem(RECENT_KEY)
                  } catch { /* ignore */ }
                  setRecents([])
                }}
              >
                امسح
              </button>
            </li>
          )}
          {list.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">لا توجد اقتراحات لـ «{value.trim()}»</li>
          )}
          {list.map((s, i) => (
            <li key={`${s.kind}-${s.label}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-start text-sm transition ${
                  i === active ? 'bg-indigo-500/10 font-bold text-indigo-700' : 'text-slate-700 hover:bg-white/60'
                }`}
                onMouseEnter={() => setActive(i)}
                onClick={() => (s.kind === 'recent' ? pickRecent(s.label) : pick(s))}
              >
                {s.kind === 'product' && (
                  <span className="text-lg" aria-hidden>{s.emoji ?? '📦'}</span>
                )}
                {s.kind === 'category' && <span aria-hidden className="text-indigo-500">🗂</span>}
                {s.kind === 'recent' && <span aria-hidden className="text-slate-400">🕘</span>}
                <span className="line-clamp-1 flex-1">{s.label}</span>
                {typeof s.priceCents === 'number' && (
                  <span className="tnum shrink-0 text-xs font-bold text-slate-400">
                    {formatAmount(s.priceCents)} ج.م
                  </span>
                )}
                {s.kind === 'category' && <span className="shrink-0 text-[11px] text-slate-400">فئة</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  )
}

const PAGE_TITLES: { test: RegExp; title: string }[] = [
  { test: /^\/$/, title: 'الكتالوج' },
  { test: /^\/product\//, title: 'تفاصيل المنتج' },
  { test: /^\/cart$/, title: 'سلة التسوق' },
  { test: /^\/checkout$/, title: 'إتمام الشراء' },
  { test: /^\/order\//, title: 'تأكيد الطلب' },
  { test: /^\/orders$/, title: 'طلباتي' },
  { test: /^\/about$/, title: 'من نحن' },
  { test: /^\/contact$/, title: 'تواصل معنا' },
  { test: /^\/policies$/, title: 'السياسات' },
  { test: /^\/login$/, title: 'تسجيل الدخول' },
  { test: /^\/register$/, title: 'حساب جديد' },
  { test: /^\/admin\/products/, title: 'المنتجات — لوحة الإدارة' },
  { test: /^\/admin\/orders/, title: 'الطلبات — لوحة الإدارة' },
  { test: /^\/admin/, title: 'لوحة الإدارة' },
]

function usePageChrome() {
  const location = useLocation()

  // Scroll to top on every navigation.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])

  // Dynamic document title.
  useEffect(() => {
    const match = PAGE_TITLES.find((p) => p.test.test(location.pathname))
    document.title = match ? `${match.title} | ${BRAND.name} ${BRAND.latin}` : `${BRAND.name} ${BRAND.latin} | ${BRAND.shortTagline}`
  }, [location.pathname])
}

function useToast() {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null)

  useEffect(() => {
    let timer = 0
    function onToast(e: Event) {
      const message = (e as CustomEvent<string>).detail
      setToast({ id: Date.now(), message })
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setToast(null), 2400)
    }
    window.addEventListener('souq:toast', onToast)
    return () => {
      window.removeEventListener('souq:toast', onToast)
      window.clearTimeout(timer)
    }
  }, [])

  return toast
}

export function showToast(message: string): void {
  window.dispatchEvent(new CustomEvent('souq:toast', { detail: message }))
}

/* #31 — scrolling announcement strip. */
function AnnouncementBar() {
  const line = (
    <>
      <span className="px-8">شحن مجاني على كل الطلبات</span>
      <span aria-hidden className="opacity-50">✦</span>
      <span className="px-8">إرجاع خلال 14 يوم</span>
      <span aria-hidden className="opacity-50">✦</span>
      <span className="px-8">الدفع تجريبي ولا يُخصم أي مبلغ حقيقي</span>
      <span aria-hidden className="opacity-50">✦</span>
      <span className="px-8">
        الخط الموحد <bdi dir="ltr">{BRAND.hotline}</bdi>
      </span>
      <span aria-hidden className="opacity-50">✦</span>
    </>
  )
  return (
    <div className="relative overflow-hidden text-white">
      <div className="accent-bar" />
      <div className="bg-gradient-to-l from-brand-700 via-violet-700 to-fuchsia-700 py-2 text-xs font-semibold">
        <div className="marquee" dir="ltr">
          <div className="flex shrink-0">{line}</div>
          <div className="flex shrink-0" aria-hidden>
            {line}
          </div>
        </div>
      </div>
    </div>
  )
}

/* #35 — category mega menu hanging off the header. */
function CategoryMenu({ categories }: { categories: string[] }) {
  const [open, setOpen] = useState(false)
  if (categories.length === 0) return null

  return (
    <div
      className="relative hidden lg:block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className="btn btn-ghost"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
      >
        الفئات
        <span aria-hidden className={`transition ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="glass-strong pop absolute top-full z-50 mt-2 grid w-[30rem] grid-cols-2 gap-1 rounded-3xl p-3 shadow-2xl">
          {categories.map((c) => {
            const s = categoryStyle(c)
            return (
              <NavLink
                key={c}
                to={`/?category=${encodeURIComponent(c)}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white/70"
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl"
                  style={{ background: s.soft }}
                >
                  <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
                    <path
                      d={s.icon}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {c}
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* #100 — mobile navigation drawer (categories were unreachable below lg). */
function MobileDrawer({ open, onClose, categories, user, onLogout }: {
  open: boolean
  onClose: () => void
  categories: string[]
  user: { name: string; role: string } | null
  onLogout: () => void
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
      isActive ? 'bg-indigo-500/15 text-indigo-700' : 'text-slate-600 hover:bg-white/60'
    }`

  return (
    <>
      {/* backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        id="mobile-drawer"
        aria-label="قائمة التنقل"
        aria-hidden={!open}
        inert={!open}
        style={{
          /* explicit transform — the RTL translate utility variant out-cascades
             translate-x-0 in the compiled sheet, so drive it inline instead */
          transform: open ? 'translateX(0)' : 'translateX(100%)',
        }}
        className={`glass-strong fixed inset-y-0 start-0 z-50 flex w-80 max-w-[85vw] flex-col overflow-y-auto border-e border-white/60 p-4 shadow-2xl transition-transform duration-300 lg:hidden ${
          open ? '' : 'pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between pb-2">
          <span className="eyebrow">Menu</span>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="إغلاق القائمة"
            className="btn btn-ghost !h-9 !w-9 !px-0"
          >
            ✕
          </button>
        </div>

        <span className="mt-3 px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">تصفح حسب الفئة</span>
        <nav className="mt-2 space-y-1">
          <NavLink to="/" end onClick={onClose} className={linkCls}>
            <span aria-hidden>✨</span> كل المنتجات
          </NavLink>
          {categories.map((c) => {
            const s = categoryStyle(c)
            return (
              <NavLink
                key={c}
                to={`/?category=${encodeURIComponent(c)}`}
                onClick={onClose}
                className={linkCls}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: s.soft }}>
                  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden>
                    <path d={s.icon} fill="none" stroke={s.color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {c}
              </NavLink>
            )
          })}
        </nav>

        <span className="mt-5 px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">روابط سريعة</span>
        <nav className="mt-2 space-y-1">
          <NavLink to="/cart" onClick={onClose} className={linkCls}><span aria-hidden>🛒</span> سلة التسوق</NavLink>
          {user && <NavLink to="/orders" onClick={onClose} className={linkCls}><span aria-hidden>📦</span> طلباتي</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin" onClick={onClose} className={linkCls}><span aria-hidden>⚙️</span> لوحة الإدارة</NavLink>}
          <NavLink to="/about" onClick={onClose} className={linkCls}><span aria-hidden>📖</span> من نحن</NavLink>
          <NavLink to="/contact" onClick={onClose} className={linkCls}><span aria-hidden>✉️</span> تواصل معنا</NavLink>
          <NavLink to="/policies" onClick={onClose} className={linkCls}><span aria-hidden>📋</span> السياسات</NavLink>
        </nav>

        <div className="mt-auto space-y-2 pt-5">
          {user ? (
            <button className="btn btn-ghost w-full" onClick={() => { onLogout(); onClose() }}>
              تسجيل الخروج ({user.name})
            </button>
          ) : (
            <>
              <Link to="/login" onClick={onClose} className="btn btn-ghost w-full">تسجيل الدخول</Link>
              <Link to="/register" onClick={onClose} className="btn btn-primary w-full">حساب جديد</Link>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

/* #94 — light/dark switch. */
function ThemeToggle() {
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => getTheme())

  useEffect(() => {
    setThemeState(getTheme())
  }, [])

  return (
    <button
      className="btn btn-ghost relative h-10 w-10 !px-0"
      title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
      aria-label={theme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
      onClick={() => setThemeState(toggleTheme())}
    >
      <span className="text-base leading-none">{theme === 'dark' ? '☀️' : '🌙'}</span>
    </button>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const { count } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [q, setQ] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [progress, setProgress] = useState(0)
  const [categories, setCategories] = useState<string[]>([])
  const [newsletter, setNewsletter] = useState('')
  const [cartPulse, setCartPulse] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const mainRef = useRef<HTMLElement | null>(null)
  usePageChrome()
  const toast = useToast()

  useEffect(() => {
    const current = new URLSearchParams(location.search).get('search')
    setQ(current ?? '')
  }, [location.search])

  // #32 header tightens after the first scroll. #104 back-to-top appears past 600px.
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8)
      setShowTop(window.scrollY > 600)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // #36 top progress bar on every navigation.
  useEffect(() => {
    setProgress((p) => p + 1)
    if (mainRef.current) mainRef.current.focus({ preventScroll: true })
  }, [location.pathname, location.search])

  // #100 — navigating always closes the mobile drawer.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname, location.search])

  // #35 feed the mega menu once.
  useEffect(() => {
    api<ProductsResponse>('/api/products?perPage=1')
      .then((d) => setCategories(d.categories.map((c) => c.category)))
      .catch(() => setCategories([]))
  }, [])

  // #75 — the cart badge pulses whenever an item lands in it.
  useEffect(() => {
    const onAdded = () => setCartPulse((p) => p + 1)
    window.addEventListener('souq:cart-added', onAdded)
    return () => window.removeEventListener('souq:cart-added', onAdded)
  }, [])

  function runSearch() {
    const trimmed = q.trim()
    navigate(trimmed ? `/?search=${encodeURIComponent(trimmed)}` : '/')
  }

  function subscribe(e: FormEvent) {
    e.preventDefault()
    if (!newsletter.trim()) return
    setNewsletter('')
    showToast('تم اشتراكك في نشرة أطلس 🎉')
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* #97 skip link */}
      <a href="#main" className="skip-link">
        تخطَّ إلى المحتوى الرئيسي
      </a>

      {/* #36 */}
      <div key={progress} className="route-progress" aria-hidden />

      <AnnouncementBar />

      <header className={`header-glass sticky top-0 z-40 ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          {/* #38 #3 — logo with a hover glow */}
          <Link
            to="/"
            className="group shrink-0 rounded-2xl transition duration-300 hover:scale-[1.02]"
            aria-label={`${BRAND.name} ${BRAND.latin} — الصفحة الرئيسية`}
          >
            <span className="transition duration-300 group-hover:drop-shadow-[0_0_14px_rgba(172,58,237,.55)]">
              <LogoHorizontal markSize={38} />
            </span>
          </Link>

          {/* #34 — search expands on focus */}
          <div className="hidden flex-1 justify-end md:flex">
            <SearchBox
              value={q}
              onChange={setQ}
              onSubmit={runSearch}
              categories={categories}
              className="w-[62%] transition-[width] duration-300 focus-within:w-full"
            />
          </div>

          <CategoryMenu categories={categories} />

          <nav className="flex items-center gap-1 sm:gap-2 ms-auto">
            {/* #100 — hamburger opens the mobile drawer below lg */}
            <button
              className="btn btn-ghost !px-2.5 lg:hidden"
              aria-label="فتح قائمة التنقل"
              aria-expanded={drawerOpen}
              aria-controls="mobile-drawer"
              onClick={() => setDrawerOpen(true)}
            >
              <span aria-hidden className="text-base">☰</span>
            </button>

            <ThemeToggle />

            {user?.role === 'admin' && (
              <NavLink
                to="/admin"
                aria-label="لوحة الإدارة"
                className={({ isActive }) =>
                  `btn !px-2.5 sm:!px-4 ${isActive ? 'border border-indigo-300/70 bg-indigo-500/15 text-indigo-700' : 'btn-ghost'}`
                }
              >
                <span className="hidden sm:inline">لوحة الإدارة</span>
                <span aria-hidden className="sm:hidden">⚙️</span>
              </NavLink>
            )}

            {user ? (
              <>
                {/* #40 — pulsing dot marks new activity */}
                <Link to="/orders" className="btn btn-ghost relative !px-2.5 sm:!px-4" aria-label="طلباتي">
                  <span className="hidden sm:inline">طلباتي</span>
                  <span aria-hidden className="sm:hidden">📦</span>
                  <span className="pulse-ok absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </Link>

                {/* #39 — account avatar (available from sm; on xs it lives in the drawer) */}
                <Link
                  to="/orders"
                  className="hidden h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 via-violet-500 to-fuchsia-500 font-display text-sm font-extrabold text-white shadow-lg shadow-indigo-500/30 ring-2 ring-white/70 sm:grid"
                  title={user.name}
                  aria-label={`حساب ${user.name}`}
                >
                  {user.name.trim().charAt(0) || 'أ'}
                </Link>

                <button
                  className="btn btn-ghost hidden !px-2.5 sm:inline-flex sm:!px-4"
                  onClick={() => void logout()}
                  aria-label="تسجيل الخروج"
                >
                  <span className="hidden sm:inline">خروج</span>
                  <span aria-hidden className="sm:hidden">🚪</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost">
                  دخول
                </Link>
                <Link
                  to="/register"
                  className="hidden rounded-full bg-gradient-to-br from-brand-500 to-violet-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-indigo-500/30 transition hover:-translate-y-0.5 sm:inline-flex"
                >
                  حساب جديد
                </Link>
              </>
            )}

            {/* #33 — badge pops whenever the count changes */}
            <Link
              to="/cart"
              data-cart-anchor
              key={`cart-${cartPulse}`}
              className={`btn btn-primary relative !px-3 sm:!px-4 ${cartPulse > 0 ? 'pop' : ''}`}
              aria-label={`السلة، ${count} منتج`}
            >
              <span className="hidden sm:inline">🛒 السلة</span>
              <span aria-hidden className="sm:hidden">🛒</span>
              {count > 0 && (
                <span
                  key={count}
                  className="pop absolute -top-2 -left-2 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 font-display text-[11px] font-bold text-white shadow-md shadow-rose-500/40 ring-2 ring-white/70"
                >
                  {count}
                </span>
              )}
            </Link>
          </nav>
        </div>

        <div className="px-4 pb-3 md:hidden">
          <SearchBox value={q} onChange={setQ} onSubmit={runSearch} categories={categories} />
        </div>
      </header>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        categories={categories}
        user={user}
        onLogout={() => void logout()}
      />

      <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 outline-none">
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>

      <footer className="relative mt-12 overflow-hidden px-4 pb-8">
        {/* #41 — oversized watermark */}
        <span
          aria-hidden
          className="watermark pointer-events-none absolute -bottom-6 right-1/2 translate-x-1/2 text-[22vw] leading-none opacity-90"
        >
          {BRAND.latin}
        </span>

        <div className="glass relative mx-auto grid max-w-7xl gap-8 rounded-3xl px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <LogoHorizontal markSize={44} />
            <p className="mt-3 text-sm leading-7 text-slate-500">
              {BRAND.tagline} — {BRAND.shortTagline} منذ {BRAND.since}.
            </p>

            {/* #43 — social rings */}
            <div className="mt-4 flex gap-2.5">
              {([
                ['f', BRAND.social.facebook, 'فيسبوك'],
                ['◎', BRAND.social.instagram, 'إنستجرام'],
                ['𝕏', BRAND.social.x, 'منصة X'],
                ['▶', BRAND.social.youtube, 'يوتيوب'],
              ] as const).map(([icon, href, label]) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/70 bg-white/40 text-sm font-bold text-slate-600 backdrop-blur transition hover:-translate-y-1 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-500/25"
                >
                  {icon}
                </a>
              ))}
            </div>

            {/* #45 — newsletter */}
            <form onSubmit={subscribe} className="mt-5 flex gap-2">
              <input
                type="email"
                required
                value={newsletter}
                onChange={(e) => setNewsletter(e.target.value)}
                placeholder="بريدك للنشرة"
                aria-label="البريد الإلكتروني للنشرة"
                className="input min-w-0 flex-1"
              />
              <button className="btn btn-primary shrink-0" type="submit">
                اشترك
              </button>
            </form>
          </div>

          <div>
            {/* #42 — eyebrow headings */}
            <span className="eyebrow">Shop</span>
            <h3 className="mt-2 text-base font-bold">روابط المتجر</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><Link className="transition hover:text-indigo-600" to="/">الكتالوج</Link></li>
              <li><Link className="transition hover:text-indigo-600" to="/cart">سلة التسوق</Link></li>
              <li><Link className="transition hover:text-indigo-600" to="/orders">طلباتي</Link></li>
              <li><Link className="transition hover:text-indigo-600" to="/login">تسجيل الدخول</Link></li>
            </ul>

            {/* #46 — footer category map */}
            {categories.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
                {categories.slice(0, 8).map((c) => (
                  <li key={c}>
                    <Link
                      to={`/?category=${encodeURIComponent(c)}`}
                      className="badge transition hover:border-indigo-300 hover:text-indigo-600"
                    >
                      {c}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <span className="eyebrow">Brand</span>
            <h3 className="mt-2 text-base font-bold">البراند</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><Link className="transition hover:text-indigo-600" to="/about">من نحن</Link></li>
              <li><Link className="transition hover:text-indigo-600" to="/contact">تواصل معنا</Link></li>
              <li><Link className="transition hover:text-indigo-600" to="/policies">سياسة الشحن والإرجاع</Link></li>
              <li><Link className="transition hover:text-indigo-600" to="/policies">الدفع والخصوصية</Link></li>
            </ul>
          </div>

          <div>
            <span className="eyebrow">Care</span>
            <h3 className="mt-2 text-base font-bold">خدمة العملاء</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li>الهاتف الموحد: <strong className="tnum text-slate-700" dir="ltr">{BRAND.hotline}</strong></li>
              <li>البريد: <a className="transition hover:text-indigo-600" href={`mailto:${BRAND.email}`} dir="ltr">{BRAND.email}</a></li>
              <li className="leading-6">{BRAND.address}</li>
              <li className="text-xs text-slate-400">{BRAND.hours}</li>
            </ul>
          </div>
        </div>

        {/* #44 — payment strip */}
        <div className="relative mx-auto mt-5 flex max-w-7xl flex-wrap items-center justify-center gap-2 sm:justify-between">
          <div className="flex flex-wrap items-center gap-2" aria-label="وسائل الدفع المقبولة">
            {['VISA', 'Mastercard', 'MEEZA', 'VALU', 'FAWRY'].map((p) => (
              <span
                key={p}
                dir="ltr"
                className="rounded-lg border border-white/70 bg-white/50 px-2.5 py-1 font-latin text-[10px] font-bold uppercase tracking-wider text-slate-500 backdrop-blur"
              >
                {p}
              </span>
            ))}
          </div>
          {/* #47 — registry line */}
          <span className="tnum text-[11px] text-slate-400" dir="ltr">
            CR 4519 • VAT 220-118-945
          </span>
        </div>

        <div className="relative mx-auto mt-4 flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} {BRAND.legal} — كل الحقوق محفوظة.</span>
          {/* #48 */}
          <span className="rounded-full bg-white/50 px-3 py-1 backdrop-blur">
            صُنع بحب في القاهرة 🇪🇬 • حساب تجريبي: admin@demo.local / admin1234
          </span>
        </div>
      </footer>

      {toast && (
        <div
          key={toast.id}
          className="toast glass-strong fixed bottom-6 left-1/2 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-slate-800"
          role="status"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-xs text-white">✓</span>
          {toast.message}
        </div>
      )}

      {/* #104 — back-to-top appears once the page is long enough to need it */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="العودة إلى أعلى الصفحة"
        className={`glass-strong fixed bottom-24 end-5 z-30 grid h-11 w-11 place-items-center rounded-full text-lg font-bold text-slate-600 shadow-xl transition duration-300 hover:text-indigo-600 md:bottom-8 ${
          showTop ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        ↑
      </button>
    </div>
  )
}
