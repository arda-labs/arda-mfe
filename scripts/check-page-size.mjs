import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Feature page.tsx stays <= MAX_LINES. Selected large workflow modules also
 * have explicit ceilings so they cannot grow while they are being decomposed.
 * Historical page monoliths live in LEGACY_BASELINE with a target date.
 */
const MAX_LINES = 400

const LEGACY_BASELINE = new Map([
  ["apps/iam/src/features/system-settings/page.tsx", "Q4-2026"],
  ["apps/account/src/features/profile/page.tsx", "Q4-2026"],
  ["apps/platform/src/features/organizations/page.tsx", "Q1-2027"],
  ["apps/platform/src/features/lookups/page.tsx", "Q1-2027"],
  ["apps/platform/src/features/provinces/page.tsx", "Q1-2027"],
  ["apps/platform/src/features/calendar/page.tsx", "Q1-2027"],
  ["apps/platform/src/features/area-types/page.tsx", "Q1-2027"],
])

const LARGE_MODULE_LIMITS = new Map([
  ["apps/workflow/src/features/workflow/shared/admin-ui.tsx", 1800],
  ["apps/workflow/src/features/workflow/shared/admin-dialogs.tsx", 1600],
  ["apps/workflow/src/features/workflow/components/bpmn-monitor.tsx", 1800],
])

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))

const violations = []
const shrunk = []
let checked = 0
let modulesChecked = 0

for (const app of readdirSync(join(root, "apps"))) {
  const featuresDir = join(root, "apps", app, "src", "features")
  if (!statSync(featuresDir, { throwIfNoEntry: false })) continue
  const entries = readdirSync(featuresDir, { recursive: true })
  for (const entry of entries.filter((name) => /(^|[\\/])page\.tsx$/.test(name))) {
    const absolute = join(featuresDir, entry)
    if (!statSync(absolute).isFile()) continue
    const relativePath = relative(root, absolute).replaceAll("\\", "/")
    const lines = readFileSync(absolute, "utf8").split("\n").length
    checked += 1
    if (lines <= MAX_LINES) {
      if (LEGACY_BASELINE.has(relativePath)) shrunk.push(relativePath)
      continue
    }
    if (LEGACY_BASELINE.has(relativePath)) continue
    violations.push(`${relativePath}: ${lines} lines exceeds ${MAX_LINES}`)
  }
}

for (const [relativePath, maxLines] of LARGE_MODULE_LIMITS) {
  const absolute = join(root, relativePath)
  if (!statSync(absolute, { throwIfNoEntry: false })?.isFile()) continue
  modulesChecked += 1
  const lines = readFileSync(absolute, "utf8").split("\n").length
  if (lines > maxLines) {
    violations.push(`${relativePath}: ${lines} lines exceeds its ${maxLines}-line ceiling`)
  }
}

if (shrunk.length > 0) {
  console.log(
    "Baseline cleanups ready (remove from LEGACY_BASELINE):",
    shrunk.join(", ")
  )
}

if (violations.length > 0) {
  console.error(
    [
      ...violations,
      "",
      "Split pages into components/ and keep tracked workflow modules below their explicit ceilings.",
    ].join("\n")
  )
  process.exit(1)
}

console.log(
  `Page size invariant OK (${checked} pages, ${modulesChecked} tracked large modules, limit ${MAX_LINES} lines)`
)
