import { CURRENCY, formatAmount } from '../lib/money'

/** #26 #27 — tabular figures with the currency mark set quieter and smaller. */
export default function Price({ cents, className = '' }: { cents: number; className?: string }) {
  return (
    <span className={`price ${className}`}>
      {formatAmount(cents)}
      <span className="cur">{CURRENCY}</span>
    </span>
  )
}
