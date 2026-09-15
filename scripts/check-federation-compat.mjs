import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import ts from "typescript"

const root = process.cwd()
const appsDir = join(root, "apps")
const appNames = (await readdir(appsDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && entry.name !== "shell")
  .map((entry) => entry.name)
  .sort()

const source = async (path) => readFile(join(root, path), "utf8")
const shellVite = await source("apps/shell/vite.config.ts")
const shellRoutes = await source("apps/shell/src/remote-routes.ts")
const shellTypes = await source("apps/shell/src/remotes.d.ts")
const shared = await source("federation.shared.ts")

const shellRemotes = [...shellVite.matchAll(/\b(\w+):\s*remote\("([^"]+)"/g)].map(
  ([, , name]) => name
)
const routeRemotes = [...shellRoutes.matchAll(/import\("([^"/]+)\/Routes"\)/g)].map(([, name]) => name)
const declaredRemotes = [...shellTypes.matchAll(/declare module "([^"]+)\/Routes"/g)].map(
  ([, name]) => name
)
const portBlock = shared.match(/export const remotePorts = \{([\s\S]*?)\} as const/)
const configuredPorts = portBlock
  ? [...portBlock[1].matchAll(/^\s*(\w+):/gm)].map(([, name]) => name)
  : []

const violations = []
const routeRegistrySource = await source("federation.routes.ts")
const routeRegistry = ts.createSourceFile("federation.routes.ts", routeRegistrySource, ts.ScriptTarget.Latest, true)
const ownership = new Map()
for (const statement of routeRegistry.statements) {
  if (!ts.isVariableStatement(statement)) continue
  for (const declaration of statement.declarationList.declarations) {
    if (declaration.name.getText(routeRegistry) !== "remoteRoutePrefixes") continue
    const object = ts.isAsExpression(declaration.initializer) ? declaration.initializer.expression : declaration.initializer
    for (const property of object.properties) {
      for (const element of property.initializer.elements) {
        const prefix = element.text
        if (ownership.has(prefix)) violations.push(`Duplicate route ownership: ${prefix}`)
        ownership.set(prefix, property.name.getText(routeRegistry))
      }
    }
  }
}
const ownerFor = (pathname) => [...ownership].find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1]
if (!(await source("apps/shell/src/App.tsx")).includes("remoteRouteEntries.map")) violations.push("Shell render must consume remoteRouteEntries")
for (const [prefix, owner] of ownership) {
  for (const [other, otherOwner] of ownership) {
    if (owner !== otherOwner && prefix.startsWith(`${other}/`)) violations.push(`Overlapping route owners: ${prefix}, ${other}`)
  }
}
const missing = (label, values) => {
  for (const app of appNames) if (!values.includes(app)) violations.push(`${label}: missing ${app}`)
}
const extra = (label, values) => {
  for (const value of values) if (!appNames.includes(value)) violations.push(`${label}: unknown ${value}`)
}

missing("shell remotes", shellRemotes)
missing("route remotes", routeRemotes)
missing("remote type declarations", declaredRemotes)
missing("remote ports", configuredPorts)
extra("shell remotes", shellRemotes)
extra("route remotes", routeRemotes)
extra("remote type declarations", declaredRemotes)
extra("remote ports", configuredPorts)

// Account keeps a custom router (layout + navigate props), so its prefixes are
// declared by hand; every other remote must be fully driven by the registry.
const customRemoteRouters = new Set(["account"])

for (const app of appNames) {
  const config = await source(`apps/${app}/vite.config.ts`)
  const manifest = JSON.parse(await source(`apps/${app}/package.json`))
  const routes = await source(`apps/${app}/src/Routes.tsx`)
  const explicitPrefixes = [...routes.matchAll(/prefix:\s*"([^"]+)"/g)].map(([, prefix]) => prefix)
  const declaredFallbacks = [...routes.matchAll(/defaultPrefixes:\s*\[([^\]]*)\]/g)].flatMap(([, list]) =>
    [...list.matchAll(/"([^"]+)"/g)].map(([, prefix]) => prefix)
  )
  for (const prefix of explicitPrefixes) {
    if (ownerFor(prefix) !== app) violations.push(`apps/${app}/src/Routes.tsx: shell does not own ${prefix} as ${app}`)
  }
  for (const fallback of declaredFallbacks) {
    if (ownerFor(fallback) !== app) violations.push(`apps/${app}/src/Routes.tsx: fallback ${fallback} is not owned by ${app}`)
  }
  if (!customRemoteRouters.has(app)) {
    for (const [prefix, owner] of ownership) {
      if (owner !== app) continue
      const reachable =
        explicitPrefixes.some((candidate) => candidate === prefix || prefix.startsWith(`${candidate}/`)) ||
        declaredFallbacks.some((candidate) => candidate === prefix || prefix.startsWith(`${candidate}/`))
      if (!reachable) {
        violations.push(`apps/${app}/src/Routes.tsx: registry prefix ${prefix} has no route or defaultPrefixes entry`)
      }
    }
  }
  if (routes.includes("fallback={null}")) violations.push(`apps/${app}/src/Routes.tsx: empty route fallback`)
  if (!routes.includes("createAppLocaleLoader")) violations.push(`apps/${app}/src/Routes.tsx: app locales must load on demand`)
  if (!config.includes('shareStrategy: "loaded-first"')) violations.push(`apps/${app}/vite.config.ts: loaded-first strategy required`)
  if (!config.includes("import { remoteSharedDeps, remotePorts }")) {
    violations.push(`apps/${app}/vite.config.ts: must use federation.shared.ts`)
  }
  if (!config.includes("shared: { ...remoteSharedDeps }")) {
    violations.push(`apps/${app}/vite.config.ts: shared singleton registry is not spread`)
  }
  if (!config.includes('filename: "remoteEntry.js"')) {
    violations.push(`apps/${app}/vite.config.ts: remoteEntry filename is not stable`)
  }
  if (typeof manifest.version !== "string" || manifest.version.trim() === "") {
    violations.push(`apps/${app}/package.json: immutable remote version is required`)
  }
}

// ── Shared workspace-dependency policy ──────────────────────────────────────
// Singleton registry keys and documented exemptions are parsed directly from
// federation.shared.ts so this script has a single source of truth. Any
// workspace package imported by two or more deployment units must either be a
// Module Federation singleton or be listed in sharedWorkspaceExemptions with a
// non-empty justification.
function extractBlock(name) {
  const block = shared.match(new RegExp(`export const ${name} = \\{([\\s\\S]*?)\\} as const`))
  return block ? block[1] : ""
}
const sharedDepsBlock = extractBlock("remoteSharedDeps")
const exemptionsBlock = extractBlock("sharedWorkspaceExemptions")

const sharedPackages = new Set(
  [...sharedDepsBlock.matchAll(/^\s*"@workspace\/([a-z0-9-]+)(\/)?"\s*:/gm)].map(([, name]) => name)
)
const exemptReasons = new Map()
for (const [, name, reason] of exemptionsBlock.matchAll(
  /"@workspace\/([a-z0-9-]+)":\s*"([^"]*)"/g
)) {
  exemptReasons.set(name, reason.trim())
}
if (!exemptionsBlock && shared.includes("@workspace/ai")) {
  violations.push("federation.shared.ts: sharedWorkspaceExemptions export missing")
}
for (const [name, reason] of exemptReasons) {
  if (!reason) {
    violations.push(`federation.shared.ts: ${name} exemption requires a justification string`)
  }
}

const IMPORT_PATTERN = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"]@workspace\/([a-z0-9-]+)/g
const importers = new Map()
let scannedFiles = 0
async function scanSources(dir, unit) {
  let entries = []
  try {
    entries = await readdir(dir, { withFileTypes: true, recursive: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (!entry.isFile() || !/\.(ts|tsx)$/.test(entry.name)) continue
    const content = await readFile(join(entry.parentPath ?? dir, entry.name), "utf8")
    scannedFiles += 1
    for (const [, name] of content.matchAll(IMPORT_PATTERN)) {
      if (!importers.has(name)) importers.set(name, new Set())
      importers.get(name).add(unit)
    }
  }
}
await scanSources(join(root, "apps/shell/src"), "shell")
for (const app of appNames) {
  await scanSources(join(root, `apps/${app}/src`), app)
}

for (const [name, units] of importers) {
  if (units.size >= 2 && !sharedPackages.has(name) && !exemptReasons.has(name)) {
    violations.push(
      `${units.size} deployment units import @workspace/${name} (${[...units]
        .sort()
        .join(", ")}) but it is neither in remoteSharedDeps nor justified in sharedWorkspaceExemptions`
    )
  }
}

if (violations.length) {
  console.error(violations.join("\n"))
  process.exit(1)
}

console.log(
  `Federation compatibility invariant OK (${appNames.length} remotes, shared-dep policy checked over ${scannedFiles} sources)`
)
