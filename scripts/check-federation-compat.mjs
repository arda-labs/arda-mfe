import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

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
const routeRemotes = [...shellRoutes.matchAll(/\bcomponent:\s*(\w+)Routes/g)].map(
  ([, name]) => name.replace(/Routes$/, "").toLowerCase()
)
const declaredRemotes = [...shellTypes.matchAll(/declare module "([^"]+)\/Routes"/g)].map(
  ([, name]) => name
)
const portBlock = shared.match(/export const remotePorts = \{([\s\S]*?)\} as const/)
const configuredPorts = portBlock
  ? [...portBlock[1].matchAll(/^\s*(\w+):/gm)].map(([, name]) => name)
  : []

const violations = []
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

for (const app of appNames) {
  const config = await source(`apps/${app}/vite.config.ts`)
  const manifest = JSON.parse(await source(`apps/${app}/package.json`))
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

if (violations.length) {
  console.error(violations.join("\n"))
  process.exit(1)
}

console.log(`Federation compatibility invariant OK (${appNames.length} remotes)`)
