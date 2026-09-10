#!/usr/bin/env node
/**
 * i18n gate: fails (exit 1) when any t("...") key used in code is missing
 * from every locale JSON (app locales + packages/i18n namespaces), or when
 * a hardcoded Vietnamese literal remains in tsx/ts sources. Complements
 * check-i18n.mjs, which only verifies en-US/vi-VN key parity.
 * Baseline: known intentional leftovers are exempted below.
 */
import { readdir, readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"

const root = process.cwd()
const appsDir = path.join(root, "apps")
const i18nLocales = path.join(root, "packages", "i18n", "src", "locales")

function getAllKeys(obj, prefix = "") {
  const keys = []
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === "object" && !Array.isArray(v)) keys.push(...getAllKeys(v, full))
    else keys.push(full)
  }
  return keys
}

// package namespaces: locales/<locale>/<ns>.json
const pkgKeys = new Set()
for (const loc of await readdir(i18nLocales)) {
  if (loc !== "vi-VN" && loc !== "en-US") continue
  for (const f of await readdir(path.join(i18nLocales, loc))) {
    if (!f.endsWith(".json")) continue
    const ns = f.replace(/\.json$/, "")
    const j = JSON.parse(await readFile(path.join(i18nLocales, loc, f), "utf8"))
    for (const k of getAllKeys(j)) pkgKeys.add(`${ns}.${k}`)
  }
}

const apps = (await readdir(appsDir)).filter((a) =>
  existsSync(path.join(appsDir, a, "locales")))

const tCall = /\bt\(\s*["'`]([\w.]+)["'`]/g
const vnLiteral = /[\u00C0-\u024F\u1EA0-\u1EFF]{2,}/

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "dist") continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) await walk(p, out)
    else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(p)
  }
  return out
}

// Domain data values persisted to the backend (not display strings) — translating
// them would corrupt API payloads. Keyed by file path suffix.
const VN_BASELINE_FILES = new Set([
  "apps/crm/src/features/customers/schemas.ts",
])

let violations = 0
for (const app of apps) {
  const appDir = path.join(appsDir, app)
  const viFile = path.join(appDir, "locales", "vi-VN.json")
  let appKeys = new Set()
  if (existsSync(viFile)) {
    appKeys = new Set(getAllKeys(JSON.parse(await readFile(viFile, "utf8"))))
  }
  const files = await walk(path.join(appDir, "src"))
  const missing = new Map()
  let hardVn = 0
  const hardVnFiles = new Map()
  for (const f of files) {
    const s = await readFile(f, "utf8")
    for (const m of s.matchAll(tCall)) {
      const key = m[1]
      const nsRoot = key.split(".")[0]
      // app keys are stored WITHOUT app namespace prefix in app locale files,
      // but used via t("app.<key>")? Inspect: app locales registered with registerAppLocales("hrm", ...)
      // meaning keys are prefixed. Test both prefixed and raw.
      const raw = key.startsWith(`${app}.`) ? key.slice(app.length + 1) : key
      if (!appKeys.has(raw) && !pkgKeys.has(key) && !appKeys.has(key)) {
        if (!missing.has(key)) missing.set(key, [])
        missing.get(key).push(path.relative(appDir, f))
      }
    }
    // skip comments naively: count only JSX/string literals lines containing VN text
    const isBaselined = [...VN_BASELINE_FILES].some((suffix) =>
      path
        .relative(appDir, f)
        .replace(/\\/g, "/")
        .endsWith(suffix.replace(/^apps\/[^/]+\//, ""))
    )
    const lines = s.split("\n")
    let cnt = 0
    lines.forEach((line, i) => {
      const t = line.trim()
      if (t.startsWith("//") || t.startsWith("*")) return
      if (vnLiteral.test(line) && (/["'`>]/.test(line))) {
        if (isBaselined) return
        cnt++
        if (!hardVnFiles.has(path.relative(appDir, f))) hardVnFiles.set(path.relative(appDir, f), [])
        hardVnFiles.get(path.relative(appDir, f)).push(i + 1)
      }
    })
    hardVn += cnt
  }
  if (missing.size > 0 || hardVn > 0) {
    violations += missing.size + hardVn
    console.log(`\n=== ${app} ===`)
    if (missing.size > 0) {
      console.log(`  MISSING KEYS (${missing.size}):`)
      for (const [k, fs] of [...missing.entries()].slice(0, 60)) {
        console.log(`    ${k}  <- ${fs[0]}${fs.length > 1 ? ` (+${fs.length - 1} files)` : ""}`)
      }
      if (missing.size > 60) console.log(`    ... and ${missing.size - 60} more`)
    }
    if (hardVn > 0) {
      console.log(`  HARDCODED VN lines: ${hardVn} in ${hardVnFiles.size} files:`)
      for (const [f, ls] of [...hardVnFiles.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 15)) {
        console.log(`    ${f} (${ls.length} lines)`)
      }
    }
  }
}

// Shared UI packages live under packages/* but resolve keys through an app
// namespace (e.g. @workspace/ai -> apps/ai). Audit those too so a component
// can never ship a t() key that no locale defines.
for (const pkg of await readdir(path.join(root, "packages"))) {
  const pkgSrc = path.join(root, "packages", pkg, "src")
  if (!existsSync(pkgSrc)) continue
  const appDir = path.join(appsDir, pkg)
  const viFile = path.join(appDir, "locales", "vi-VN.json")
  if (!existsSync(viFile)) continue
  const appKeys = new Set(getAllKeys(JSON.parse(await readFile(viFile, "utf8"))))
  const files = await walk(pkgSrc)
  const missing = new Map()
  for (const f of files) {
    const s = await readFile(f, "utf8")
    for (const m of s.matchAll(tCall)) {
      const key = m[1]
      if (!key.startsWith(`${pkg}.`)) continue
      const raw = key.slice(pkg.length + 1)
      if (!appKeys.has(raw) && !appKeys.has(key)) {
        if (!missing.has(key)) missing.set(key, [])
        missing.get(key).push(path.relative(root, f))
      }
    }
  }
  if (missing.size > 0) {
    violations += missing.size
    console.log(`\n=== packages/${pkg} ===`)
    console.log(`  MISSING KEYS (${missing.size}):`)
    for (const [k, fs] of [...missing.entries()].slice(0, 60)) {
      console.log(`    ${k}  <- ${fs[0]}${fs.length > 1 ? ` (+${fs.length - 1} files)` : ""}`)
    }
    if (missing.size > 60) console.log(`    ... and ${missing.size - 60} more`)
  }
}

if (violations > 0) {
  console.log(`\n-- i18n audit FAILED: ${violations} violation(s) --`)
  process.exit(1)
}
console.log("\n-- i18n audit OK: no missing t() keys, no hardcoded VN literals --")
