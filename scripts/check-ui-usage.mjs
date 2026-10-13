import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Design-system usage gate (design board 09, step 6). App and package code
 * uses the shared form controls instead of browser-native ones:
 *   - <select>              -> SelectField / Combobox (@workspace/ui)
 *   - <input type="date">   -> DateField (@workspace/ui)
 *   - components/page-title -> PageHeader (PageTitle is a deprecated alias)
 *   - colours come from tokens (globals.css): no hex literals, no raw
 *     Tailwind palette classes such as bg-red-500 / text-emerald-600
 * Exemptions are per file and per rule, each with its reason.
 */
const PALETTE =
  "red|green|blue|amber|yellow|emerald|indigo|violet|purple|orange|rose|sky|slate|gray|zinc|teal|cyan|lime|pink|fuchsia|neutral|stone"

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
  {
    id: "hex-color",
    pattern: /\[#[0-9a-fA-F]{3,8}\]|["'`]#[0-9a-fA-F]{3,8}["'`]/,
    hint: "use a token (bg-primary, var(--success)...) from globals.css",
  },
  {
    id: "raw-palette-color",
    pattern: new RegExp(
      String.raw`(?<![\w-])(?:[\w\-\[\]=&:]+:)*(?:bg|text|border|ring|fill|stroke|from|via|to|divide|outline|decoration|shadow|placeholder|accent|caret)(?:-[xytblrse])?-(?:${PALETTE})-\d{2,3}(?![\w-])`
    ),
    hint: "use success / warning(-ink) / info / destructive / primary / muted tokens",
  },
]

/** path -> rule ids the file may break, with the reason. */
const EXEMPT = new Map([
  // Month/year pickers inside the filter date popover are part of the primitive.
  ["packages/ui/src/components/date-popover.tsx", ["native-select"]],
  // Thumbnails draw the light and the dark theme side by side.
  ["apps/account/src/features/settings/appearance/page.tsx", ["hex-color"]],
  // Code blocks keep a dark surface in both themes.
  ["packages/ai/src/components/markdown.tsx", ["raw-palette-color"]],
  // Where the colours are defined: brand presets and the chart fallback palette.
  ["packages/theme/src/brand.ts", ["hex-color"]],
  ["packages/ai/src/lib/chart-theme.ts", ["hex-color"]],
  // Scanners need black on white; canvas exports need an opaque background.
  ["packages/ui/src/components/qr-code.tsx", ["hex-color"]],
  ["packages/ui/src/components/image-crop-dialog.tsx", ["hex-color"]],
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
    if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) continue
    const absolute = join(dir, entry)
    const path = relative(root, absolute).replaceAll("\\", "/")
    const allowed = EXEMPT.get(path) ?? []
    checked++
    const lines = readFileSync(absolute, "utf8").split("\n")
    lines.forEach((line, index) => {
      const trimmed = line.trim()
      if (/^(\/\/|\/\*|\*)/.test(trimmed)) return
      for (const rule of RULES) {
        if (allowed.includes(rule.id)) continue
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
