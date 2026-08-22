import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs"
import path from "node:path"

const repoRoot = path.resolve(import.meta.dirname, "..")
const workspaceRoots = ["apps", "packages"]
const workspaces = new Map()

for (const rootName of workspaceRoots) {
  const root = path.join(repoRoot, rootName)
  for (const entry of readdirSync(root)) {
    const directory = path.join(root, entry)
    const manifestPath = path.join(directory, "package.json")
    if (!statSync(directory).isDirectory() || !existsSync(manifestPath)) continue
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
    workspaces.set(manifest.name, { directory, manifest })
  }
}

const errors = []
const graph = new Map()

for (const [name, workspace] of workspaces) {
  const declared = new Set([
    ...Object.keys(workspace.manifest.dependencies ?? {}),
    ...Object.keys(workspace.manifest.devDependencies ?? {}),
    ...Object.keys(workspace.manifest.peerDependencies ?? {}),
  ])
  const workspaceDependencies = [...declared].filter((dependency) =>
    workspaces.has(dependency)
  )
  graph.set(name, workspaceDependencies)

  const sourceRoot = path.join(workspace.directory, "src")
  if (!existsSync(sourceRoot)) continue
  for (const file of walk(sourceRoot)) {
    if (!/\.(?:ts|tsx|js|jsx|mjs)$/.test(file)) continue
    const source = readFileSync(file, "utf8")
    const relativeFile = path.relative(repoRoot, file).replaceAll("\\", "/")

    if (
      relativeFile !== "apps/shell/src/mf-share-init.ts" &&
      /(?:^|["'])[^"'\n]*packages[\\/][^\\/]+[\\/]src[\\/]/m.test(source)
    ) {
      errors.push(`${relativeFile}: imports another workspace's src directory`)
    }

    for (const match of source.matchAll(/(?:from\s+|import\s*\(?)['"](@workspace\/[^/'"]+)/g)) {
      const importedPackage = match[1]
      if (
        importedPackage !== name &&
        workspaces.has(importedPackage) &&
        !declared.has(importedPackage)
      ) {
        errors.push(`${relativeFile}: ${importedPackage} is not declared in package.json`)
      }
    }
  }
}

const visiting = new Set()
const visited = new Set()
const stack = []

function visit(name) {
  if (visiting.has(name)) {
    const start = stack.indexOf(name)
    errors.push(`workspace dependency cycle: ${[...stack.slice(start), name].join(" -> ")}`)
    return
  }
  if (visited.has(name)) return
  visiting.add(name)
  stack.push(name)
  for (const dependency of graph.get(name) ?? []) visit(dependency)
  stack.pop()
  visiting.delete(name)
  visited.add(name)
}

for (const name of graph.keys()) visit(name)

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"))
  process.exit(1)
}

console.log(`Package boundaries OK (${workspaces.size} workspaces, no cycles).`)

function* walk(directory) {
  for (const entry of readdirSync(directory)) {
    const target = path.join(directory, entry)
    if (statSync(target).isDirectory()) yield* walk(target)
    else yield target
  }
}
