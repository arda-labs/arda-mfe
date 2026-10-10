import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

const violations = []
const extensions = new Set([".ts", ".tsx", ".js", ".jsx"])

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", ".git", ".cloudflare", "cloudflare"].includes(entry.name)) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(path)
      continue
    }
    // Test files are excluded: this gate exists to make every *shipped* fetch
    // credentialed, and a test asserting on a hostile payload legitimately
    // contains fetch() inside a string literal. Excluding them keeps the gate
    // strict on real code without forcing test fixtures to be rewritten.
    if (/\.(test|spec)\.[a-z]+$/.test(entry.name)) continue
    if (!extensions.has(entry.name.slice(entry.name.lastIndexOf(".")))) continue
    const source = (await readFile(path, "utf8")).replace(/\/\/.*$/gm, "")
    for (const match of source.matchAll(/(^|[^\w.])fetch\s*\(/gm)) {
      const window = source.slice(match.index, match.index + 1200)
      if (!/credentials\s*:\s*["']include["']/.test(window)) {
        const line = source.slice(0, match.index).split("\n").length
        violations.push(`${path}:${line}: raw fetch must explicitly include credentials`)
      }
    }
  }
}

await walk(".")
if (violations.length) {
  console.error(violations.join("\n"))
  process.exit(1)
}
console.log("Credentialed fetch invariant OK")
