import { Link } from 'react-router-dom'
import { BRAND } from '../../shared/brand'

export interface Crumb {
  label: string
  to?: string
}

/** #37 — a visible, structured trail on every inner page. */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="مسار التنقل" className="text-sm text-slate-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li className="flex items-center gap-1.5">
          <Link to="/" className="transition hover:text-indigo-600">
            {BRAND.name}
          </Link>
        </li>
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5" aria-current={last ? 'page' : undefined}>
              <span aria-hidden className="text-slate-300">
                ⁄
              </span>
              {item.to && !last ? (
                <Link to={item.to} className="transition hover:text-indigo-600">
                  {item.label}
                </Link>
              ) : (
                <span className={last ? 'font-semibold text-slate-700' : undefined}>{item.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
