// Build gate: fail if any color from Open Design's AI-Tell lists
// (purple-gradient / trust-gradient blue / trust-gradient cyan /
// ai-default-indigo) appears in the source tree or the SQLite
// catalog data. Hexes are stored here WITHOUT the '#' prefix so
// this file never matches its own scan. Run via `npm run od:colors`.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const AI_TELL_HEXES = new Set([
  // purple-gradient
  'a855f7', '9333ea', '7c3aed', '6d28d9', '581c87', '8b5cf6', 'a78bfa', 'c4b5fd', 'ddd6fe', 'ede9fe',
  '6366f1', '4f46e5', '4338ca', '3730a3', '312e81', '818cf8', 'a5b4fc', 'c7d2fe', 'e0e7ff', 'eef2ff',
  // trust-gradient blue
  '3b82f6', '2563eb', '1d4ed8', '1e40af', '1e3a8a', '60a5fa', '93c5fd', 'bfdbfe', '0ea5e9', '0284c7',
  '0369a1', '38bdf8', '7dd3fc',
  // trust-gradient cyan
  '06b6d4', '0891b2', '0e7490', '155e75', '164e63', '22d3ee', '67e8f9', 'a5f3fc',
])

const ROOT = process.cwd()
const SKIP_DIRS = new Set(['node_modules', 'dist', 'data', '.git'])
const SKIP_FILES = new Set(['od.log', 'od.err', 'server.log', 'server.err'])
const TEXT_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts',
  '.css', '.html', '.json', '.md', '.txt',
])

// Match #rrggbb tokens only — \b rejects 8-digit hexes like #eef2ff00.
const HEX_RE = /#([0-9a-f]{6})\b/gi

function checkText(text, where, hits) {
  for (const m of text.matchAll(HEX_RE)) {
    if (AI_TELL_HEXES.has(m[1].toLowerCase())) {
      const line = text.slice(0, m.index).split('\n').length
      hits.push(`${where}:${line}  #${m[1]}`)
    }
  }
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
      yield* walk(path.join(dir, entry.name))
    } else if (entry.isFile()) {
      if (SKIP_FILES.has(entry.name)) continue
      if (!TEXT_EXTS.has(path.extname(entry.name))) continue
      yield path.join(dir, entry.name)
    }
  }
}

const hits = []
let filesScanned = 0
for (const file of walk(ROOT)) {
  filesScanned++
  checkText(fs.readFileSync(file, 'utf8'), path.relative(ROOT, file), hits)
}

// SQLite data: scan every TEXT value of every table.
const dbPath = process.env.DB_PATH || path.join(ROOT, 'data', 'store.db')
let dbValues = 0
if (fs.existsSync(dbPath)) {
  const db = new DatabaseSync(dbPath, { readOnly: true })
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all()
  for (const { name } of tables) {
    const q = `"${name.replace(/"/g, '""')}"`
    const cols = db.prepare(`PRAGMA table_info(${q})`).all()
    const rows = db.prepare(`SELECT * FROM ${q}`).all()
    for (const row of rows) {
      for (const col of cols) {
        const v = row[col.name]
        if (typeof v === 'string') {
          dbValues++
          checkText(v, `${path.relative(ROOT, dbPath)}:${name}.${col.name}`, hits)
        }
      }
    }
  }
  db.close()
} else {
  console.log(`od-colors: no database at ${dbPath} — skipping data scan`)
}

if (hits.length > 0) {
  console.error(`od-colors: ${hits.length} AI-Tell listed color(s) found:`)
  for (const h of hits) console.error(`  ${h}`)
  process.exit(1)
}
console.log(`od-colors: clean — ${filesScanned} files, ${dbValues} db values, 0 hits`)
