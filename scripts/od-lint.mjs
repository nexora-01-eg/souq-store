#!/usr/bin/env node
/**
 * design:lint — run Open Design's anti-slop artifact linter against the built
 * HTML so visual regressions gate `npm run build` alongside typecheck.
 *
 * Exit policy:
 *   - Open Design not installed, or its daemon not running  -> 0 (loud skip;
 *     set OD_LINT_REQUIRED=1 to turn skips into failures)
 *   - lint findings at/above the threshold                 -> 1
 *   - lint itself errored (bad usage / unparseable output) -> 2
 *
 * Usage: node scripts/od-lint.mjs [file.html] [p0|p1|p2|none]
 */
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const target = process.argv[2] ?? 'dist/index.html'
const failOn = process.argv[3] ?? 'p0'
const required = Boolean(process.env.OD_LINT_REQUIRED)

function skip(reason) {
  const msg = `[design:lint] skipped — ${reason}`
  if (required) {
    console.error(`${msg} (OD_LINT_REQUIRED=1, so failing)`)
    process.exit(1)
  }
  console.warn(msg)
  process.exit(0)
}

function findOdExe() {
  // An explicit OD_EXE is authoritative — never silently fall back to
  // auto-discovery when the caller pointed us at a specific binary.
  if (process.env.OD_EXE) return existsSync(process.env.OD_EXE) ? process.env.OD_EXE : null
  const candidates = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'Open Design', 'Open Design.exe'),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Open Design', 'Open Design.exe'),
    'C:/Program Files/Open Design/Open Design.exe',
  ].filter(Boolean)
  return candidates.find((p) => existsSync(p)) ?? null
}

const exe = findOdExe()
if (!exe) skip('Open Design is not installed (set OD_EXE to its executable)')

const cli = path.join(path.dirname(exe), 'resources', 'app', 'prebundled', 'daemon', 'daemon-cli.mjs')
if (!existsSync(cli)) skip(`Open Design CLI entry missing at ${cli}`)

if (!existsSync(target)) {
  console.error(`[design:lint] ${target} not found — run the build first`)
  process.exit(2)
}

const res = spawnSync(exe, [cli, 'lint', target, '--fail-on', failOn, '--json'], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  encoding: 'utf8',
  windowsHide: true,
})

if (res.error) skip(`could not launch Open Design (${res.error.message})`)

const out = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim()

// od lint exit codes: 0 clean · 1 findings at threshold · 2 usage · 3 daemon down
if (res.status === 3) skip('Open Design daemon is not running (start the app, then retry)')
if (res.status === 2) {
  console.error(`[design:lint] usage error:\n${out}`)
  process.exit(2)
}

let report
try {
  report = JSON.parse(out)
} catch {
  console.error(`[design:lint] unexpected linter output:\n${out}`)
  process.exit(2)
}

const { p0 = 0, p1 = 0, p2 = 0 } = report.counts ?? {}
if (p0 + p1 + p2 > 0) {
  console.error(`[design:lint] ${target}: P0=${p0} P1=${p1} P2=${p2}`)
  for (const f of report.findings ?? []) {
    console.error(`  [${f.severity}] ${f.id} — ${f.message}`)
    console.error(`    fix: ${f.fix}`)
  }
  process.exit(1)
}

console.log(`[design:lint] ${target}: clean (P0=${p0} P1=${p1} P2=${p2})`)
process.exit(0)
