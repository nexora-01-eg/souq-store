/** #74 #75 — the product physically flies into the cart, then the badge pulses. */

export function notifyCartAdded(): void {
  window.dispatchEvent(new CustomEvent('souq:cart-added'))
}

export function flyToCart(from: Element | null, emoji: string): void {
  const target = document.querySelector<HTMLElement>('[data-cart-anchor]')
  if (!target || !from || typeof document === 'undefined') {
    notifyCartAdded()
    return
  }

  const a = from.getBoundingClientRect()
  const b = target.getBoundingClientRect()
  const x0 = a.left + a.width / 2
  const y0 = a.top + a.height / 2
  const x1 = b.left + b.width / 2
  const y1 = b.top + b.height / 2

  const el = document.createElement('div')
  el.setAttribute('aria-hidden', 'true')
  el.textContent = emoji
  el.style.cssText = [
    'position:fixed',
    `left:${x0 - 24}px`,
    `top:${y0 - 24}px`,
    'width:48px',
    'height:48px',
    'display:grid',
    'place-items:center',
    'font-size:26px',
    'border-radius:999px',
    'background:rgba(255,255,255,.92)',
    'box-shadow:0 10px 30px -8px rgba(121,70,229,.6)',
    'z-index:80',
    'pointer-events:none',
    `--fly-x:${x1 - x0}px`,
    `--fly-y:${y1 - y0}px`,
    'animation:fly-to-cart .75s cubic-bezier(.4,0,.25,1) forwards',
  ].join(';')

  document.body.appendChild(el)
  window.setTimeout(() => el.remove(), 800)
  window.setTimeout(notifyCartAdded, 620)
}
