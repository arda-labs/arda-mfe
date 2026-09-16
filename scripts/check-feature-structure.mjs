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
 * 5. Wire types (any type passed as the generic of a transport call) use
 *    snake_case fields; view models may use camelCase because they are mapped
 *    in the adapter. Documented camelCase wire exceptions are allowlisted
 *    (the auth boundary), everything else lives in WIRE_CASE_BASELINE until the
 *    snake_case migration wave lands (see arda-be scripts/check-json-tags.mjs).
 *
 * Run with --report to print every finding without failing (used to refresh
 * the baselines when a migration wave lands). --baseline prints ready-to-paste
 * WIRE_CASE_BASELINE entries.
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

/** R5 — transport calls whose type argument is wire shape. */
const WIRE_TRANSPORT_NAMES =
  /\b(getCanonical|getCanonicalList|postCanonical|putCanonical|deleteCanonical|request|requestList|fetchJson|getText)\s*</g
const WIRE_TRANSPORT_METHODS = /\bapi\s*\.\s*(get|post|put|patch|delete)\s*</g

/** Generic wrappers/primitives that are not wire types themselves. */
const WIRE_WRAPPER_NAMES = new Set([
  "ApiSuccess",
  "ListResponse",
  "Partial",
  "Omit",
  "Pick",
  "Record",
  "Array",
  "Readonly",
  "NonNullable",
  "Promise",
  "FormData",
  "File",
  "Blob",
  "URLSearchParams",
  "SearchParams",
  "ListQueryInput",
  "ApiRequestOptions",
  "AbortSignal",
  "void",
  "unknown",
  "any",
  "string",
  "number",
  "boolean",
  "null",
  "undefined",
])

/** Documented camelCase wire exceptions (mirror the BE PROTOCOL_ALLOWLIST). */
const WIRE_CASE_ALLOWLIST = new Map([
  ["account:MyProfile", "auth boundary /api/iam/me is camelCase by design"],
])

// Historical wire types. Remove an entry in the same PR that renames the fields.
const WIRE_CASE_BASELINE = new Map([
  ["ai:AIProfile", "Q2-2027"],
  ["ai:AISettings", "Q2-2027"],
  ["ai:AnalyticsSummary", "Q2-2027"],
  ["ai:ApprovalDetail", "Q2-2027"],
  ["ai:CatalogTool", "Q2-2027"],
  ["ai:ConversationMessage", "Q2-2027"],
  ["ai:ConversationSummary", "Q2-2027"],
  ["ai:QuotasDTO", "Q2-2027"],
  ["ai:TestConnectionResult", "Q2-2027"],
  ["crm:Customer", "Q2-2027"],
  ["crm:CustomerAmendment", "Q2-2027"],
  ["crm:CustomerRelationship", "Q2-2027"],
  ["crm:WorkflowCase", "Q2-2027"],
  ["crm:WorkflowTask", "Q2-2027"],
  ["crm:WorkflowTimelineEvent", "Q2-2027"],
  ["crm:WorkflowWorkItem", "Q2-2027"],
  ["finance:Account", "Q2-2027"],
  ["finance:CoaAccount", "Q2-2027"],
  ["finance:ReviewWorkItem", "Q2-2027"],
  ["iam:AuditStats", "Q2-2027"],
  ["iam:IdentityConsistencyIssue", "Q2-2027"],
  ["iam:Tenant", "Q2-2027"],
  ["iam:TenantMember", "Q2-2027"],
  ["loan:FormationClaimedTask", "Q2-2027"],
  ["loan:FormationWorkItem", "Q2-2027"],
  ["workflow:ClaimWorkItemResponse", "Q2-2027"],
  ["workflow:DescriptionTemplate", "Q2-2027"],
  ["workflow:ElementInstanceStat", "Q2-2027"],
  ["workflow:JobDefinitionState", "Q2-2027"],
  ["workflow:OperateElementInstance", "Q2-2027"],
  ["workflow:OperateHistoryPage", "Q2-2027"],
  ["workflow:OperateIncidentPage", "Q2-2027"],
  ["workflow:OperateInstanceDetail", "Q2-2027"],
  ["workflow:OperateInstancePage", "Q2-2027"],
  ["workflow:OperateJob", "Q2-2027"],
  ["workflow:OperateJobPage", "Q2-2027"],
  ["workflow:OperateSummary", "Q2-2027"],
  ["workflow:OperateUserTaskPage", "Q2-2027"],
  ["workflow:OperateVariable", "Q2-2027"],
  ["workflow:ProcessDefinitionOperate", "Q2-2027"],
  ["workflow:ProcessInstanceRuntime", "Q2-2027"],
  ["workflow:ProcessRole", "Q2-2027"],
  ["workflow:SlaPolicy", "Q2-2027"],
  ["workflow:WorkflowAssignmentRule", "Q2-2027"],
  ["workflow:WorkflowCase", "Q2-2027"],
  ["workflow:WorkflowCaseType", "Q2-2027"],
  ["workflow:WorkflowDelegation", "Q2-2027"],
  ["workflow:WorkflowProcessDefinition", "Q2-2027"],
  ["workflow:WorkflowRoleCatalog", "Q2-2027"],
  ["workflow:WorkflowRoleMembership", "Q2-2027"],
  ["workflow:WorkflowTimelineEvent", "Q2-2027"],
])

const isReport = process.argv.includes("--report")
const isBaseline = process.argv.includes("--baseline")
const root = resolve(fileURLToPath(new URL("..", import.meta.url)))

const violations = []
const shrunk = []
const wireCleanups = []
let apiFiles = 0
let scanned = 0

/** R5 collections: declarations per app, references per wire type. */
const declaredFields = new Map()
const wireRefs = new Map()

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
      /\/features\/(?:.*\/)?api\/.+\.ts$/.test(rel)
    const isTypesModule = /\/features\/(?:.*\/)?types\.ts$/.test(rel)
    if (isApiModule) apiFiles += 1

    if (isApiModule || isTypesModule) {
      collectWireCasing(app, rel, source, declaredFields, wireRefs)
    }

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

// R5 — wire casing: a type passed as a transport generic must be snake_case.
const pendingWire = []
for (const key of wireRefs.keys()) {
  const decl = declaredFields.get(key)
  if (!decl || decl.fields.length === 0) continue
  const camel = decl.fields.filter((field) =>
    /^[a-z][a-zA-Z0-9]*[A-Z]/.test(field)
  )
  if (camel.length === 0) continue
  if (WIRE_CASE_ALLOWLIST.has(key)) continue
  if (WIRE_CASE_BASELINE.has(key)) continue
  pendingWire.push({ key, camel, file: decl.file })
  violations.push(
    `${decl.file}: wire type ${key.split(":")[1]} has camelCase fields (${camel
      .slice(0, 4)
      .join(
        ", "
      )}${camel.length > 4 ? ", …" : ""}) — snake_case is the REST convention`
  )
}
for (const key of WIRE_CASE_BASELINE.keys()) {
  const decl = declaredFields.get(key)
  const camel = decl
    ? decl.fields.filter((field) => /^[a-z][a-zA-Z0-9]*[A-Z]/.test(field))
    : []
  if (camel.length === 0 || !wireRefs.has(key)) wireCleanups.push(key)
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

if (wireCleanups.length > 0) {
  console.log(
    "Wire-casing baseline cleanups ready (remove from WIRE_CASE_BASELINE):",
    wireCleanups.join(", ")
  )
}

if (isBaseline) {
  console.log("const WIRE_CASE_BASELINE = new Map([")
  for (const item of pendingWire.sort((a, b) => a.key.localeCompare(b.key))) {
    console.log(`  ["${item.key}", "Q2-2027"],`)
  }
  console.log("])")
  process.exit(0)
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

/**
 * R5 helper: collects declared object fields and wire-type references from an
 * api/types module. A "wire reference" is any type argument of a transport
 * call; the wrapper generics are unwrapped by name.
 */
function collectWireCasing(app, rel, source, declaredFields, wireRefs) {
  const file = ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true)
  for (const statement of file.statements) {
    if (ts.isInterfaceDeclaration(statement)) {
      const fields = statement.members
        .filter((member) => ts.isPropertySignature(member))
        .map((member) => member.name?.getText(file))
        .filter(Boolean)
      declaredFields.set(`${app}:${statement.name.text}`, { file: rel, fields })
    } else if (ts.isTypeAliasDeclaration(statement)) {
      const fields = []
      collectTypeLiteralFields(statement.type, fields)
      if (fields.length > 0) {
        declaredFields.set(`${app}:${statement.name.text}`, {
          file: rel,
          fields,
        })
      }
    }
  }

  const matchers = [
    new RegExp(WIRE_TRANSPORT_NAMES.source, "g"),
    new RegExp(WIRE_TRANSPORT_METHODS.source, "g"),
  ]
  for (const matcher of matchers) {
    for (const match of source.matchAll(matcher)) {
      const angle = source.indexOf("<", match.index + match[0].length - 1)
      if (angle < 0) continue
      const args = balancedTypeArgs(source, angle)
      if (!args) continue
      for (const name of extractWireNames(args)) {
        const key = `${app}:${name}`
        const refs = wireRefs.get(key) ?? new Set()
        refs.add(rel)
        wireRefs.set(key, refs)
      }
    }
  }
}

function collectTypeLiteralFields(node, fields) {
  if (ts.isTypeLiteralNode(node)) {
    for (const member of node.members) {
      if (ts.isPropertySignature(member)) {
        const name = member.name?.getText()
        if (name) fields.push(name)
      }
    }
    return
  }
  if (ts.isIntersectionTypeNode(node) || ts.isUnionTypeNode(node)) {
    for (const type of node.types) collectTypeLiteralFields(type, fields)
  }
}

/** Returns the text inside the `<...>` starting at `start`, or null. */
function balancedTypeArgs(source, start) {
  let depth = 0
  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    if (char === "<") depth += 1
    else if (char === ">") {
      depth -= 1
      if (depth === 0) return source.slice(start + 1, index)
    }
  }
  return null
}

/** PascalCase identifiers in a type argument that are not generic wrappers. */
function extractWireNames(text) {
  const names = new Set()
  for (const match of text.matchAll(/\b[A-Z][A-Za-z0-9_]*\b/g)) {
    if (!WIRE_WRAPPER_NAMES.has(match[0])) names.add(match[0])
  }
  return names
}

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
