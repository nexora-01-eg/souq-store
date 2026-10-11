import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api, ApiError } from '../../api'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'
import ProductVisual from '../../components/ProductVisual'
import { centsToEgp, egpToCents, formatEgp, formatInt } from '../../lib/money'
import type { ProductWithSold } from '../../lib/types'

const EMOJIS = ['🎧', '⌚', '⌨️', '🔌', '🔋', '🎤', '📷', '🔊', '👟', '🧥', '👕', '🎒', '☕', '🫖', '💡', '🥤', '🏋️', '🌸', '🧴', '📖', '💻', '🧸', '🎁', '🍫']
const COLORS = ['#7946e5', '#02b2c7', '#059669', '#d97706', '#e11d48', '#ac3aed', '#0d9488', '#db2777']
const PAGE_SIZE = 25

interface FormState {
  name: string
  category: string
  price: string
  stock: string
  emoji: string
  color: string
  description: string
}

const EMPTY_FORM: FormState = {
  name: '',
  category: '',
  price: '',
  stock: '0',
  emoji: '🛍️',
  color: '#7946e5',
  description: '',
}

export default function ProductsPage() {
  const [items, setItems] = useState<ProductWithSold[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; product: ProductWithSold } | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    try {
      const d = await api<{ items: ProductWithSold[] }>('/api/admin/products')
      setItems(d.items)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل المنتجات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const categories = useMemo(() => [...new Set(items.map((p) => p.category))], [items])
  const filtered = useMemo(() => {
    const q = search.trim()
    if (!q) return items
    return items.filter((p) => p.name.includes(q) || p.category.includes(q))
  }, [items, search])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  function openCreate() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setModal({ mode: 'create' })
  }

  function openEdit(p: ProductWithSold) {
    setForm({
      name: p.name,
      category: p.category,
      price: centsToEgp(p.priceCents),
      stock: String(p.stock),
      emoji: p.emoji,
      color: p.color,
      description: p.description,
    })
    setFormError(null)
    setModal({ mode: 'edit', product: p })
  }

  async function saveForm(e: FormEvent) {
    e.preventDefault()
    if (!modal) return
    const priceCents = egpToCents(form.price)
    if (form.name.trim().length < 2) return setFormError('اسم المنتج قصير جداً')
    if (form.category.trim().length < 2) return setFormError('أدخل فئة المنتج')
    if (priceCents === null) return setFormError('السعر غير صالح')
    const stock = Number(form.stock)
    if (!Number.isInteger(stock) || stock < 0) return setFormError('المخزون غير صالح')

    setSaving(true)
    setFormError(null)
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        priceCents,
        stock,
        emoji: form.emoji,
        color: form.color,
        description: form.description.trim(),
      }
      if (modal.mode === 'create') {
        await api('/api/admin/products', { method: 'POST', body: payload })
        setNotice(`تمت إضافة «${payload.name}» بنجاح`)
      } else {
        await api(`/api/admin/products/${modal.product.id}`, { method: 'PATCH', body: payload })
        setNotice(`تم حفظ تعديلات «${payload.name}»`)
      }
      setModal(null)
      await load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'تعذر الحفظ')
    } finally {
      setSaving(false)
    }
  }

  async function patchStock(p: ProductWithSold, stock: number) {
    if (stock < 0) return
    try {
      await api(`/api/admin/products/${p.id}/stock`, { method: 'PATCH', body: { stock } })
      setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, stock } : x)))
      setNotice(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر تحديث المخزون')
    }
  }

  async function toggleActive(p: ProductWithSold) {
    try {
      await api(`/api/admin/products/${p.id}`, { method: 'PATCH', body: { active: !p.active } })
      setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)))
      setNotice(p.active ? `تم إخفاء «${p.name}» من المتجر` : `تم إظهار «${p.name}» في المتجر`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذر تحديث المنتج')
    }
  }

  async function deleteProduct(p: ProductWithSold) {
    try {
      await api(`/api/admin/products/${p.id}`, { method: 'DELETE' })
      setItems((prev) => prev.filter((x) => x.id !== p.id))
      setConfirmDeleteId(null)
      setNotice(`تم حذف «${p.name}»`)
    } catch (err) {
      setConfirmDeleteId(null)
      setError(err instanceof ApiError ? err.message : 'تعذر حذف المنتج')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {/* #24 #25 #30 — eyebrow + display heading */}
          <span className="eyebrow">Catalog</span>
          <h1 className="display mt-1.5 text-2xl">المنتجات</h1>
          <p className="tnum mt-1 text-sm text-slate-500">
            {formatInt(items.length)} منتج في الكتالوج
            {search.trim() && ` — ${formatInt(filtered.length)} مطابق للبحث`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + منتج جديد
        </button>
      </div>

      {notice && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200/60 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 backdrop-blur">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="إغلاق">✕</button>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700 backdrop-blur">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="إغلاق">✕</button>
        </div>
      )}

      <div className="glass rounded-3xl p-4">
        <input
          className="input max-w-sm"
          placeholder="ابحث بالاسم أو الفئة..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
        />
      </div>

      {/* #58 — friendly empty state instead of a bare table box */}
      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          compact
          icon={<span className="relative grid h-16 w-16 place-items-center rounded-3xl bg-white/40 text-3xl shadow-lg backdrop-blur">🔎</span>}
          title={search.trim() ? 'مفيش منتجات مطابقة لبحثك' : 'الكتالوج فاضي لسه'}
          text={search.trim() ? `مفيش نتائج للكلمة «${search.trim()}» — جرّب كلمة تانية أو الفئة.` : 'أضف أول منتج من زر «+ منتج جديد» فوق.'}
          {...(search.trim() ? { actionLabel: 'مسح البحث', onAction: () => setSearch('') } : { actionLabel: 'منتج جديد', onAction: openCreate })}
        />
      )}

      <div className={`card overflow-x-auto ${!loading && !error && filtered.length === 0 ? 'hidden' : ''}`}>
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-2xl" />
            ))}
          </div>
        ) : (
          <table className="w-full min-w-[820px]">
            <thead className="rounded-t-2xl bg-white/50 backdrop-blur">
              <tr>
                <th className="table-th">المنتج</th>
                <th className="table-th">الفئة</th>
                <th className="table-th">السعر</th>
                <th className="table-th">المخزون</th>
                <th className="table-th">المبيعات</th>
                <th className="table-th">الحالة</th>
                <th className="table-th">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map((p) => (
                <tr key={p.id} className={`transition odd:bg-white/25 hover:bg-white/60 ${p.active ? '' : 'opacity-60'}`}>
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <ProductVisual
                        emoji={p.emoji}
                        color={p.color}
                        className="h-11 w-11 shrink-0 rounded-lg"
                        emojiClass="text-xl"
                      />
                      <div className="min-w-0">
                        <div className="line-clamp-1 font-semibold text-slate-800">{p.name}</div>
                        <div className="text-xs text-slate-400" dir="auto">
                          /{p.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="table-td">
                    <span className="badge">{p.category}</span>
                  </td>
                  <td className="table-td tnum font-semibold">{formatEgp(p.priceCents)}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <button
                        className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                        onClick={() => void patchStock(p, p.stock - 1)}
                        disabled={p.stock <= 0}
                        aria-label="إنقاص المخزون"
                      >
                        −
                      </button>
                      <span className={`tnum w-10 text-center font-bold ${p.stock <= 8 ? 'text-amber-600' : ''}`}>
                        {p.stock}
                      </span>
                      <button
                        className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                        onClick={() => void patchStock(p, p.stock + 1)}
                        aria-label="زيادة المخزون"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="table-td tnum">{formatInt(p.sold)}</td>
                  <td className="table-td">
                    {/* #82 — unified status pills */}
                    <span className={`pill ${p.active ? 'pill-ok' : 'pill-info'}`}>
                      {p.active ? 'ظاهر' : 'مخفي'}
                    </span>
                  </td>
                  <td className="table-td">
                    {confirmDeleteId === p.id ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-rose-600">متأكد؟</span>
                        <button className="btn btn-danger px-2.5 py-1 text-xs" onClick={() => void deleteProduct(p)}>
                          نعم احذف
                        </button>
                        <button className="btn btn-ghost px-2.5 py-1 text-xs" onClick={() => setConfirmDeleteId(null)}>
                          تراجع
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button className="btn btn-ghost px-2.5 py-1 text-xs" onClick={() => openEdit(p)}>
                          تعديل
                        </button>
                        <button className="btn btn-ghost px-2.5 py-1 text-xs" onClick={() => void toggleActive(p)}>
                          {p.active ? 'إخفاء' : 'إظهار'}
                        </button>
                        <button
                          className="btn btn-ghost px-2.5 py-1 text-xs text-rose-600"
                          onClick={() => setConfirmDeleteId(p.id)}
                        >
                          حذف
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-3xl px-5 py-3">
          <span className="tnum text-sm text-slate-500">
            عرض {formatInt(safePage * PAGE_SIZE + 1)}–{formatInt(Math.min((safePage + 1) * PAGE_SIZE, filtered.length))} من{' '}
            {formatInt(filtered.length)} منتج
          </span>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost px-3 py-1.5 text-xs"
              disabled={safePage <= 0}
              onClick={() => setPage(safePage - 1)}
            >
              السابق
            </button>
            <span className="text-sm font-semibold text-slate-600">
              {safePage + 1} / {pageCount}
            </span>
            <button
              className="btn btn-ghost px-3 py-1.5 text-xs"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            >
              التالي
            </button>
          </div>
        </div>
      )}

      {modal && (
        <Modal
          title={modal.mode === 'create' ? 'إضافة منتج جديد' : `تعديل: ${modal.product.name}`}
          onClose={() => setModal(null)}
          wide
        >
          <form onSubmit={saveForm} className="space-y-4" noValidate>
            {formError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {formError}
              </div>
            )}

            <div>
              <label className="label" htmlFor="pf-name">اسم المنتج</label>
              <input
                id="pf-name"
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: سماعات بلوتوث"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="pf-cat">الفئة</label>
                <input
                  id="pf-cat"
                  className="input"
                  list="category-list"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="إلكترونيات"
                />
                <datalist id="category-list">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="label" htmlFor="pf-price">السعر (ج.م)</label>
                <input
                  id="pf-price"
                  className="input"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="99.99"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="label" htmlFor="pf-stock">المخزون</label>
                <input
                  id="pf-stock"
                  className="input"
                  inputMode="numeric"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="label">الرمز (Emoji)</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className={`grid h-9 w-9 place-items-center rounded-lg text-lg transition ${
                      form.emoji === e ? 'bg-indigo-100 ring-2 ring-indigo-500' : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                    onClick={() => setForm({ ...form, emoji: e })}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">اللون</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`h-9 w-9 rounded-lg transition ${form.color === c ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}
                    style={{ background: c }}
                    onClick={() => setForm({ ...form, color: c })}
                    aria-label={`لون ${c}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="pf-desc">الوصف</label>
              <textarea
                id="pf-desc"
                className="input min-h-24"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="وصف قصير للمنتج..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>
                إلغاء
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'جارٍ الحفظ...' : 'حفظ المنتج'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
