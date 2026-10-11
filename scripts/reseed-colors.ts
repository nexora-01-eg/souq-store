// Dev-only tool for the brand catalog colors. Two modes:
//   (default)  redistribute the brand PALETTE (server/catalog.ts) evenly
//              across the whole catalog — deterministic round-robin by id,
//              so 1200 products land on exactly 120 of each of the 10 colors.
//   --fix      minimal repair: only products carrying an AI-Tell listed
//              color are snapped to the nearest palette color (RGB
//              Euclidean distance); every clean color is left untouched.
// Both modes are idempotent and self-verify that no listed color survives.
// Run via `npm run reseed:colors` or `npm run reseed:colors -- --fix`.
import fs from 'node:fs'
import path from 'node:path'
import { openDb, all } from '../server/db'
import { PALETTE } from '../server/catalog'

// --- development-only guard ----------------------------------------------
const nodeEnv = process.env.NODE_ENV ?? ''
if (nodeEnv && nodeEnv !== 'development') {
  console.error(`reseed-colors: refused — NODE_ENV=${nodeEnv}. This tool only runs in development.`)
  process.exit(1)
}

// Colors Open Design's AI-Tell linter flags (purple-gradient, trust-gradient,
// ai-default-indigo). Kept here so the reseed verifies its own output.
const AI_TELL_HEXES = new Set([
  'a855f7', '9333ea', '7c3aed', '6d28d9', '581c87', '8b5cf6', 'a78bfa', 'c4b5fd', 'ddd6fe', 'ede9fe',
  '6366f1', '4f46e5', '4338ca', '3730a3', '312e81', '818cf8', 'a5b4fc', 'c7d2fe', 'e0e7ff', 'eef2ff',
  '3b82f6', '2563eb', '1d4ed8', '1e40af', '1e3a8a', '60a5fa', '93c5fd', 'bfdbfe', '0ea5e9', '0284c7',
  '0369a1', '38bdf8', '7dd3fc', '06b6d4', '0891b2', '0e7490', '155e75', '164e63', '22d3ee', '67e8f9',
  'a5f3fc',
])

const fixMode = process.argv.includes('--fix')

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'store.db')
if (!fs.existsSync(dbPath)) {
  console.error(`reseed-colors: no database at ${dbPath}`)
  console.error('  run `npm run dev:server` once so it creates and seeds the catalog, then retry')
  process.exit(1)
}

const db = openDb(dbPath)
const products = all<{ id: number; color: string }>(db, 'SELECT id, color FROM products ORDER BY id')
if (products.length === 0) {
  console.error('reseed-colors: products table is empty — nothing to recolor')
  console.error('  run `npm run dev:server` once so it seeds the catalog, then retry')
  process.exit(1)
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/** Nearest palette color by squared RGB distance (ties → first in PALETTE). */
function nearestPalette(color: string): string {
  const [r, g, b] = hexToRgb(color)
  let best = PALETTE[0]
  let bestDist = Infinity
  for (const candidate of PALETTE) {
    const [cr, cg, cb] = hexToRgb(candidate)
    const dist = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2
    if (dist < bestDist) {
      bestDist = dist
      best = candidate
    }
  }
  return best
}

let updated = 0
const fixes: string[] = []
db.exec('BEGIN')
try {
  const stmt = db.prepare('UPDATE products SET color = ? WHERE id = ?')
  if (fixMode) {
    for (const p of products) {
      const bare = p.color.replace('#', '').toLowerCase()
      if (!AI_TELL_HEXES.has(bare)) continue
      const target = nearestPalette(p.color)
      stmt.run(target, p.id)
      updated++
      fixes.push(`${p.color} → ${target}`)
    }
  } else {
    for (let i = 0; i < products.length; i++) {
      const target = PALETTE[i % PALETTE.length]
      if (products[i].color.toLowerCase() !== target) {
        stmt.run(target, products[i].id)
        updated++
      }
    }
  }
  db.exec('COMMIT')
} catch (err) {
  db.exec('ROLLBACK')
  throw err
}

const dist = all<{ color: string; n: number }>(
  db,
  'SELECT color, COUNT(*) AS n FROM products GROUP BY color ORDER BY n DESC, color ASC',
)

const dirty = dist.filter((r) => AI_TELL_HEXES.has(r.color.replace('#', '').toLowerCase()))
if (dirty.length > 0) {
  console.error('reseed-colors: FAILED verification — AI-Tell listed colors still present:')
  for (const r of dirty) console.error(`  ${r.color} ×${r.n}`)
  db.close()
  process.exit(1)
}

console.log(`reseed-colors: ${fixMode ? 'fix' : 'even'} mode · ${products.length} products · ${updated} updated · ${products.length - updated} kept`)
if (fixMode && fixes.length > 0) {
  for (const f of fixes.slice(0, 20)) console.log(`  ${f}`)
  if (fixes.length > 20) console.log(`  … and ${fixes.length - 20} more`)
}
for (const r of dist) console.log(`  ${r.color} ×${r.n}`)
console.log(`✔ clean — ${dist.length} palette colors, zero AI-Tell colors`)
db.close()
