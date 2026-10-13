import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Design-system usage gate (design board 09, step 6). App and package code
 * uses the shared form controls instead of browser-native ones:
 *   - <select>              -> SelectField / Combobox (@workspace/ui)
 *   - <input type="date">   -> DateField (@workspace/ui)
 *   - components/page-title -> PageHeader (PageTitle is a deprecated alias)
 * The primitives themselves live in packages/ui and are exempt.
 */
const RULES = [
  {
    id: "native-select",
    pattern: /<select[\s>]/,
    hint: "use SelectField or Combobox from @workspace/ui",
  },
  {
    id: "native-date-input",
    pattern: /type=["']date["']/,
    hint: "use DateField from @workspace/ui/components/date-field",
  },
  {
    id: "page-title-import",
    pattern: /@workspace\/ui\/components\/page-title["']/,
    hint: "import PageHeader from @workspace/ui/components/page-header",
  },
]

/** Files allowed to keep a native control, with the reason. */
const EXEMPT = new Map([
  // Month/year pickers inside the filter date popover are part of the primitive.
  ["packages/ui/src/components/date-popover.tsx", "primitive"],
])

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const scanRoots = ["apps", "packages"]
  .flatMap((dir) =>
    readdirSync(join(root, dir)).map((name) => join(root, dir, name, "src"))
  )
  .filter((dir) => statSync(dir, { throwIfNoEntry: false })?.isDirectory())

const violations = []
let checked = 0

for (const dir of scanRoots) {
  for (const entry of readdirSync(dir, { recursive: true })) {
    if (!/\.tsx$/.test(entry) || /\.test\.tsx$/.test(entry)) continue
    const absolute = join(dir, entry)
    const path = relative(root, absolute).replaceAll("\\", "/")
    if (EXEMPT.has(path)) continue
    checked++
    const lines = readFileSync(absolute, "utf8").split("\n")
    lines.forEach((line, index) => {
      const trimmed = line.trim()
      if (/^(\/\/|\/\*|\*)/.test(trimmed)) return
      for (const rule of RULES) {
        if (rule.pattern.test(line)) {
          violations.push(`${path}:${index + 1} ${rule.id} — ${rule.hint}`)
        }
      }
    })
  }
}

if (violations.length > 0) {
  console.error(`UI usage gate: ${violations.length} violation(s)`)
  for (const violation of violations) console.error(`  ${violation}`)
  process.exit(1)
}

console.log(`UI usage gate OK (${checked} files)`)
