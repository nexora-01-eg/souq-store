interface PaginationProps {
  page: number
  pages: number
  onPage: (page: number) => void
}

/** Numbered pagination with ellipsis — built for 100+ page catalogs. */
export default function Pagination({ page, pages, onPage }: PaginationProps) {
  if (pages <= 1) return null

  const items: (number | 'left' | 'right')[] = []
  const window = 1
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= window) {
      items.push(p)
    } else if (items[items.length - 1] !== 'left') {
      items.push('left')
    }
  }

  const btn =
    'grid h-9 min-w-9 place-items-center rounded-xl px-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="الترقيم">
      <button className={`${btn} btn-ghost`} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        السابق
      </button>

      {items.map((it, i) =>
        it === 'left' || it === 'right' ? (
          <span key={`${it}-${i}`} className="px-1 text-slate-400">
            …
          </span>
        ) : (
          <button
            key={it}
            onClick={() => onPage(it)}
            aria-current={it === page ? 'page' : undefined}
            className={
              it === page
                ? `${btn} bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30`
                : `${btn} btn-ghost`
            }
          >
            {it}
          </button>
        ),
      )}

      <button className={`${btn} btn-ghost`} disabled={page >= pages} onClick={() => onPage(page + 1)}>
        التالي
      </button>

      <span className="ms-2 text-sm text-slate-500">
        صفحة {page} من {pages}
      </span>
    </nav>
  )
}
