import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

/**
 * Reference-type gate (ADR-005, architecture review 2026-10-11 §4.6/§5):
 * a wire type that several remotes consume is declared exactly once, in
 * packages/api/src/generated/<doc>.ts (from arda-be OpenAPI) or, until the
 * owning service generates a document, in packages/api/src/reference/<svc>.ts.
 *
 * Under apps/*\/src a declaration whose name is in REFERENCE_TYPES may only
 * be an alias of (or a narrowing on top of) a type imported from those
 * modules. An `interface`, or a `type` whose body is an object literal that
 * references none of the imported canonical types, is a redeclaration and
 * fails the gate — that is exactly the drift this gate exists to stop
 * (WorkflowCase once had three copies, 9 vs 22 fields).
 *
 *   bun run check:reference-types
 *   bun run check:reference-types --report   (print without failing)
 */

/** Names that are reference types. Add here when a type gets its canonical home. */
const REFERENCE_TYPES = new Set([
  // workflow-v1 (generated)
  "WorkflowCase",
  "BusinessCase",
  "WorkflowCaseType",
  "WorkflowTask",
  "WorkflowTimelineEvent",
  "WorkflowWorkItem",
  "WorkItem",
  // mdm-v1 (generated)
  "InterestRate",
  "InterestRateTier",
  "Currency",
  "Country",
  "DebtGroup",
  // platform (packages/api/src/reference/platform.ts until platform-v1 exists)
  "Organization",
  "PlatformOrganization",
  "GeoAdminUnit",
  "Parameter",
  // crm (packages/api/src/reference/crm.ts until crm-v1 exists)
  "Customer",
])

/** Modules that own reference types. */
const CANONICAL_MODULES = [/^@workspace\/api\/generated\//, /^@workspace\/api\/reference\//]

const isReport = process.argv.includes("--report")
const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const violations = []
let scanned = 0

for (const app of readdirSync(join(root, "apps"))) {
  const srcDir = join(root, "apps", app, "src")
  if (!statSync(srcDir, { throwIfNoEntry: false })?.isDirectory()) continue
  for (const entry of readdirSync(srcDir, { recursive: true })) {
    const absolute = join(srcDir, entry)
    if (!statSync(absolute, { throwIfNoEntry: false })?.isFile()) continue
    if (!/\.(ts|tsx)$/.test(absolute) || /\.d\.ts$/.test(absolute)) continue
    scanned += 1
    const rel = relative(root, absolute).replaceAll("\\", "/")
    const source = readFileSync(absolute, "utf8")
    if (![...REFERENCE_TYPES].some((name) => source.includes(name))) continue
    checkFile(rel, source)
  }
}

if (violations.length > 0) {
  const message = [
    ...violations,
    "",
    "Reference types are declared once: import them from @workspace/api/generated/<doc>",
    "or @workspace/api/reference/<svc> and narrow with `Omit<...> & { ... }` if needed.",
    "See docs/conventions/feature-structure.md §3 (ADR-005).",
  ].join("\n")
  if (isReport) console.warn(message)
  else {
    console.error(message)
    process.exit(1)
  }
}
console.log(
  `Reference types invariant OK (${REFERENCE_TYPES.size} names, ${scanned} sources checked)`
)

function checkFile(rel, source) {
  const file = ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true)
  const canonical = new Set()
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    const specifier = statement.moduleSpecifier.text
    if (!CANONICAL_MODULES.some((pattern) => pattern.test(specifier))) continue
    const bindings = statement.importClause?.namedBindings
    if (!bindings) continue
    if (ts.isNamespaceImport(bindings)) canonical.add(bindings.name.text)
    else for (const element of bindings.elements) canonical.add(element.name.text)
  }

  const visit = (node) => {
    if (ts.isInterfaceDeclaration(node) && REFERENCE_TYPES.has(node.name.text)) {
      violations.push(
        `${rel}:${line(file, node)}: interface ${node.name.text} redeclares a reference type`
      )
    } else if (ts.isTypeAliasDeclaration(node) && REFERENCE_TYPES.has(node.name.text)) {
      if (hasObjectLiteral(node.type) && !referencesCanonical(node.type, canonical, file)) {
        violations.push(
          `${rel}:${line(file, node)}: type ${node.name.text} declares its own shape instead of aliasing the canonical type`
        )
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
}

function hasObjectLiteral(node) {
  if (ts.isTypeLiteralNode(node)) return true
  let found = false
  ts.forEachChild(node, (child) => {
    if (!found && hasObjectLiteral(child)) found = true
  })
  return found
}

function referencesCanonical(node, canonical, file) {
  if (ts.isTypeReferenceNode(node)) {
    const name = node.typeName
    const text = ts.isIdentifier(name) ? name.text : name.left.getText(file)
    if (canonical.has(text)) return true
  }
  let found = false
  ts.forEachChild(node, (child) => {
    if (!found && referencesCanonical(child, canonical, file)) found = true
  })
  return found
}

function line(file, node) {
  return file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1
}
