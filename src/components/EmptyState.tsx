import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LogoStacked } from './Logo'

/** #58 #85 #99 — friendly empty states with a drawn illustration, never a bare box. */
export default function EmptyState({
  icon,
  title,
  text,
  actionLabel,
  actionTo,
  onAction,
  compact = false,
  children,
}: {
  icon?: ReactNode
  title: string
  text?: string
  actionLabel?: string
  actionTo?: string
  onAction?: () => void
  compact?: boolean
  children?: ReactNode
}) {
  return (
    <div
      className={`glass grid place-items-center gap-3 rounded-3xl text-center ${compact ? 'p-8' : 'p-12'}`}
    >
      <div className="relative grid place-items-center">
        <span
          aria-hidden
          className="absolute h-24 w-24 rounded-full blur-2xl"
          style={{ background: 'radial-gradient(circle, rgba(172,58,237,.35), transparent 70%)' }}
        />
        {icon ?? (
          <span className="floaty relative grid h-16 w-16 place-items-center rounded-3xl bg-white/40 text-3xl shadow-lg backdrop-blur">
            🛍️
          </span>
        )}
      </div>

      <h2 className="display text-xl">{title}</h2>
      {text && <p className="max-w-sm text-sm leading-7 text-slate-500">{text}</p>}

      {children}

      {(actionTo || onAction) && (
        <>
          {actionTo ? (
            <Link to={actionTo} className="btn btn-primary mt-1 px-6">
              {actionLabel}
            </Link>
          ) : (
            <button className="btn btn-primary mt-1 px-6" onClick={onAction}>
              {actionLabel}
            </button>
          )}
        </>
      )}

      <LogoStacked markSize={34} className="mt-3 opacity-40" />
    </div>
  )
}
