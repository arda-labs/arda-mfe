import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Page size gate — convention: a feature page.tsx stays <= MAX_LINES and
 * decomposes into components/ beyond that (see docs/conventions/mfe-structure).
 * Historical monolith pages live in LEGACY_BASELINE with a target date so CI
 * keeps failing for NEW violations while the debt shrinks deliberately.
 */
const MAX_LINES = 400

const LEGACY_BASELINE = new Map([
  ["apps/platform/src/features/templates/page.tsx", "Q4-2026"],
  ["apps/platform/src/features/credit-institutions/page.tsx", "Q4-2026"],
  ["apps/iam/src/features/system-settings/page.tsx", "Q4-2026"],
  ["apps/iam/src/features/users/page.tsx", "Q4-2026"],
  ["apps/finance/src/features/finance/operation/page.tsx", "Q4-2026"],
  ["apps/account/src/features/profile/page.tsx", "Q4-2026"],
  ["apps/finance/src/features/finance/accounts/page.tsx", "Q1-2027"],
  ["apps/platform/src/features/areas/page.tsx", "Q1-2027"],
  ["apps/platform/src/features/organizations/page.tsx", "Q1-2027"],
  ["apps/platform/src/features/wards/page.tsx", "Q1-2027"],
  ["apps/platform/src/features/lookups/page.tsx", "Q1-2027"],
  ["apps/platform/src/features/provinces/page.tsx", "Q1-2027"],
  ["apps/iam/src/features/groups/page.tsx", "Q1-2027"],
  ["apps/finance/src/features/finance/approvals/page.tsx", "Q1-2027"],
  ["apps/platform/src/features/calendar/page.tsx", "Q1-2027"],
  ["apps/platform/src/features/area-types/page.tsx", "Q1-2027"],
  ["apps/iam/src/features/audit/page.tsx", "Q1-2027"],
  ["apps/platform/src/features/ai-settings/page.tsx", "Q1-2027"],
])

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))

const violations = []
const shrunk = []
let checked = 0

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
      "Split pages into components/ per docs/conventions/mfe-structure; do not extend LEGACY_BASELINE without a team decision.",
    ].join("\n")
  )
  process.exit(1)
}

console.log(`Page size invariant OK (${checked} pages, limit ${MAX_LINES} lines)`)