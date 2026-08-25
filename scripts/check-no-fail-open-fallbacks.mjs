import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

const roots = ["apps", "packages"]
const ignored = new Set(["node_modules", "dist", "build", "coverage"])
const patterns = [
  /\.catch\(\(\)\s*=>\s*\[\]/,
  /\.catch\(\(\)\s*=>\s*\(\{\s*items:\s*\[\]/,
  /\.catch\(\(\)\s*=>\s*setAvailableOrgs\(\[\]\)/,
]
const violations = []

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(path)
      continue
    }
    if (!entry.isFile() || !/\.(ts|tsx)$/.test(entry.name)) continue
    const source = await readFile(path, "utf8")
    for (const pattern of patterns) {
      if (pattern.test(source)) {
        violations.push(`${path}: API failure is converted to empty fallback data`)
        break
      }
    }
  }
}

for (const root of roots) await walk(root)
if (violations.length) {
  console.error(violations.join("\n"))
  process.exit(1)
}
console.log("Fail-open fallback invariant OK")
