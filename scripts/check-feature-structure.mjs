import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

/**
 * Feature structure gate — enforces the standard described in
 * docs/conventions/feature-structure.md:
 *
 * 1. API modules stay small: features/**\/api.ts and features/**\/api/*.ts
 *    <= MAX_API_LINES; features/**\/types.ts <= MAX_TYPES_LINES. Historical
 *    offenders live in LEGACY_BASELINE with a target date, mirroring
 *    check-page-size.mjs.
 * 2. Transport boundary: only api modules may import transport values
 *    (`api`, canonical helpers, client factories) from @workspace/api*.
 *    Type-only imports and pure helpers (downloadFile, query/list builders)
 *    stay available to any layer. Shell bootstrap is an approved exception.
 * 3. Cross-feature imports may only reach api.ts / types.ts / list-query.ts /
 *    index.ts of another feature, never its components/ or page.
 * 4. api modules are framework-free: no React or UI imports.
 *
 * Run with --report to print every finding without failing (used to refresh
 * the baselines when a migration wave lands).
 */

const MAX_API_LINES = 300
const MAX_TYPES_LINES = 250

// Historical files. Remove an entry in the same PR that shrinks the file.
const LEGACY_BASELINE = new Map([])

/** Files allowed to import transport values outside a feature api module. */
const TRANSPORT_BOUNDARY_BASELINE = new Map([
  ["apps/shell/src/App.tsx", "shell session bootstrap (approved)"],
])

const TRANSPORT_VALUE_NAMES = new Set([
  "api",
  "createApiClient",
  "createCredentialedFetch",
  "getCanonical",
  "getCanonicalList",
  "postCanonical",
  "putCanonical",
  "deleteCanonical",
])

const TRANSPORT_MODULES = new Set(["@workspace/api", "@workspace/api/client"])

/** UI internals of another feature may never be imported directly. */
const PRIVATE_FEATURE_SEGMENTS = [
  /^components\//,
  /^pages\//,
  /^page$/,
  /^page\.tsx$/,
  /-page$/,
  /-page\.tsx$/,
]

/** App-level shared area: not a feature, safe to import from anywhere. */
const SHARED_AREA = "shared"

/** Cross-feature UI coupling kept as dated legacy (empty: see loan-batches index). */
const CROSS_FEATURE_BASELINE = new Map([])

const FORBIDDEN_API_IMPORTS = [/^react$/, /^react-dom/, /^@workspace\/i18n$/]

const isReport = process.argv.includes("--report")
const root = resolve(fileURLToPath(new URL("..", import.meta.url)))

const violations = []
const shrunk = []
let apiFiles = 0
let scanned = 0

for (const app of readdirSync(join(root, "apps"))) {
  const featuresDir = join(root, "apps", app, "src", "features")
  if (!statSync(featuresDir, { throwIfNoEntry: false })) continue
  for (const entry of readdirSync(featuresDir, { recursive: true })) {
    const absolute = join(featuresDir, entry)
    if (!statSync(absolute, { throwIfNoEntry: false })?.isFile()) continue
    if (!/\.(ts|tsx)$/.test(absolute)) continue
    scanned += 1
    const rel = relative(root, absolute).replaceAll("\\", "/")
    const source = readFileSync(absolute, "utf8")
    const lines = source.split("\n").length
    const isApiModule =
      /\/features\/(?:.*\/)?api\.ts$/.test(rel) ||
      /\/features\/(?:.*\/)?api\/[^/]+\.ts$/.test(rel)
    const isTypesModule = /\/features\/(?:.*\/)?types\.ts$/.test(rel)
    if (isApiModule) apiFiles += 1

    // R1 — size.
    if (isApiModule && lines > MAX_API_LINES && !LEGACY_BASELINE.has(rel)) {
      violations.push(
        `${rel}: ${lines} lines exceeds api limit ${MAX_API_LINES}`
      )
    }
    if (isTypesModule && lines > MAX_TYPES_LINES) {
      violations.push(
        `${rel}: ${lines} lines exceeds types limit ${MAX_TYPES_LINES}`
      )
    }

    const imports = collectImports(absolute, source)
    if (isApiModule) {
      // R2 — api modules are framework-free.
      for (const specifier of imports.map((item) => item.specifier)) {
        if (FORBIDDEN_API_IMPORTS.some((pattern) => pattern.test(specifier))) {
          violations.push(`${rel}: api module must not import "${specifier}"`)
        }
      }
    }

    for (const item of imports) {
      // R2 — transport boundary.
      if (
        TRANSPORT_MODULES.has(item.specifier) &&
        item.values.some((name) => TRANSPORT_VALUE_NAMES.has(name)) &&
        !isApiModule &&
        !TRANSPORT_BOUNDARY_BASELINE.has(rel)
      ) {
        violations.push(
          `${rel}: imports transport value from "${item.specifier}" outside a feature api module`
        )
      }

      // R3 — cross-feature UI imports.
      const target = resolveFeatureTarget(rel, item.specifier)
      if (
        !target ||
        target.feature === currentFeature(rel) ||
        target.feature === SHARED_AREA
      ) {
        continue
      }
      if (
        PRIVATE_FEATURE_SEGMENTS.some((pattern) => pattern.test(target.rest)) &&
        !CROSS_FEATURE_BASELINE.has(rel)
      ) {
        violations.push(
          `${rel}: deep import into another feature ("${item.specifier}") — only api/types/list-query/index are public`
        )
      }
    }
  }
}

// Cleanup reminder: a baseline entry whose file is gone or already within the
// limit should be removed in the same PR.
for (const [path] of LEGACY_BASELINE) {
  if (shrunk.includes(path)) continue
  const absolute = join(root, path)
  const lines = statSync(absolute, { throwIfNoEntry: false })
    ? readFileSync(absolute, "utf8").split("\n").length
    : 0
  if (lines <= MAX_API_LINES) shrunk.push(path)
}

if (shrunk.length > 0) {
  console.log(
    "Baseline cleanups ready (remove from LEGACY_BASELINE):",
    shrunk.join(", ")
  )
}

if (violations.length > 0) {
  const message = [
    ...violations,
    "",
    "Feature structure standard: docs/conventions/feature-structure.md",
    isReport
      ? "(report mode — add legitimate legacy entries to the baseline in scripts/check-feature-structure.mjs)"
      : "Split/tidy the file or register a dated baseline entry (team decision).",
  ].join("\n")
  if (isReport) {
    console.warn(message)
  } else {
    console.error(message)
    process.exit(1)
  }
}

console.log(
  `Feature structure invariant OK (${apiFiles} api modules, ${scanned} sources checked)`
)

/** Parses module specifiers plus the value (non type-only) import names. */
function collectImports(absolute, source) {
  const file = ts.createSourceFile(
    absolute,
    source,
    ts.ScriptTarget.Latest,
    true
  )
  const result = []
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    const specifier = statement.moduleSpecifier.text
    const clause = statement.importClause
    if (!clause) {
      result.push({ specifier, values: ["*side-effect*"] })
      continue
    }
    const values = []
    if (clause.name) values.push(clause.name.text)
    if (clause.namedBindings) {
      if (ts.isNamespaceImport(clause.namedBindings)) {
        values.push(clause.namedBindings.name.text)
      } else {
        for (const element of clause.namedBindings.elements) {
          const typeOnly = clause.isTypeOnly || element.isTypeOnly
          if (!typeOnly) values.push(element.name.text)
        }
      }
    }
    result.push({ specifier, values })
  }
  return result
}

/** Maps an import specifier back to a features/<feature>/<rest> target. */
function resolveFeatureTarget(rel, specifier) {
  const fromDir = rel.split("/").slice(0, -1).join("/")
  let absolute = null
  if (specifier.startsWith("@/")) {
    absolute = specifier.slice(2)
  } else if (specifier.startsWith(".")) {
    const base = fromDir.split("/")
    for (const part of specifier.split("/")) {
      if (part === "." || part === "") continue
      if (part === "..") base.pop()
      else base.push(part)
    }
    absolute = base.join("/")
  } else {
    return null
  }
  const match = absolute.match(/(?:^|\/)features\/([^/]+)\/(.+)$/)
  if (!match) return null
  return { feature: match[1], rest: match[2] }
}

function currentFeature(rel) {
  const match = rel.match(/\/features\/([^/]+)\//)
  return match ? match[1] : null
}
