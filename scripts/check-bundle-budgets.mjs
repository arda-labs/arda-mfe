import { readFile } from "node:fs/promises"
import { gzipSync } from "node:zlib"
import path from "node:path"

// Boot = the HTML entry's static graph; a page's cost is what it adds on top of
// an already-booted app, so compare page closures against the boot closure.
const BOOT_BUDGET = 400 * 1024
const PAGE_BUDGET = 400 * 1024
const root = path.resolve(import.meta.dirname, "..")
const violations = []

const { readdir } = await import("node:fs/promises")
const apps = (await readdir(path.join(root, "apps"), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

for (const app of apps) {
  const dist = path.join(root, "apps", app, "dist")
  const manifest = JSON.parse(await readFile(path.join(dist, ".vite/manifest.json"), "utf8"))
  const sizes = new Map()
  const graph = async (key, seen = new Set()) => {
    if (seen.has(key)) return seen
    const chunk = manifest[key]
    if (!chunk) throw new Error(`Missing chunk ${app}:${key}`)
    seen.add(key)
    if (!sizes.has(key)) sizes.set(key, gzipSync(await readFile(path.join(dist, chunk.file))).length)
    for (const dependency of chunk.imports ?? []) await graph(dependency, seen)
    return seen
  }
  const total = (keys) => [...keys].reduce((sum, key) => sum + sizes.get(key), 0)

  if (!manifest["index.html"]) {
    violations.push(`${app}: bundled index.html entry is missing`)
    continue
  }
  const boot = await graph("index.html")
  const bootBytes = total(boot)
  if (bootBytes > BOOT_BUDGET) {
    violations.push(`${app}: boot ${Math.round(bootBytes / 1024)} KiB gzip > ${BOOT_BUDGET / 1024} KiB`)
  }
  for (const dependency of boot) {
    if (/packages\/ai\/src\/index/.test(dependency)) violations.push(`${app}: AI runtime on the boot path`)
  }

  let largest = { key: "", bytes: 0 }
  for (const key of Object.keys(manifest)) {
    const isPage = /(?:^|\/)src\/features\/.+\/(?:page|[a-z0-9-]+-page)\.tsx$/.test(key)
    if (!isPage) continue
    const page = await graph(key)
    for (const dependency of page) {
      if (/exceljs[./-]/i.test(manifest[dependency].file)) violations.push(`${app}:${key}: ExcelJS on the initial static path`)
    }
    const bytes = [...page].filter((dependency) => !boot.has(dependency)).reduce((sum, dependency) => sum + sizes.get(dependency), 0)
    if (bytes > largest.bytes) largest = { key, bytes }
    if (bytes > PAGE_BUDGET) {
      violations.push(`${app}:${key}: +${Math.round(bytes / 1024)} KiB gzip over boot > ${PAGE_BUDGET / 1024} KiB`)
    }
  }
  console.log(
    `${app}: boot ${Math.round(bootBytes / 1024)} KiB, largest page +${Math.round(largest.bytes / 1024)} KiB (${largest.key})`
  )
}

if (violations.length) {
  console.error(`\n${violations.join("\n")}`)
  process.exit(1)
}
console.log("\nBundle budgets OK")
