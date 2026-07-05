import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const backup = join(
  import.meta.dir,
  "../apps/hrm/src/features/hrm/pages.backup.tsx"
)
const lines = readFileSync(backup, "utf8").split("\n")
const dir = join(import.meta.dir, "../apps/hrm/src/features/hrm")

const pages = [
  ["positions/page.tsx", 214, 331],
  ["job-titles/page.tsx", 332, 419],
  ["org-units/page.tsx", 420, 567],
  ["registrations/page.tsx", 568, 715],
  ["employees/page.tsx", 1184, 1220],
]

for (const [file, start, end] of pages) {
  writeFileSync(join(dir, file), lines.slice(start - 1, end).join("\n") + "\n")
}

console.log("page bodies reset")
