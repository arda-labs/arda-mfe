import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs"
import path from "node:path"
import ts from "typescript"
import { remoteSharedDeps, shellSharedDeps } from "../federation.shared.ts"

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

  for (const [exportName, exportTarget] of Object.entries(workspace.manifest.exports ?? {})) {
    if (exportName.includes("*")) continue
    const target = path.join(workspace.directory, exportTarget)
    if (!existsSync(target)) {
      errors.push(`${name}: export ${exportName} points to missing ${exportTarget}`)
    }
  }

  const sourceRoot = path.join(workspace.directory, "src")
  if (!existsSync(sourceRoot)) continue
  for (const file of walk(sourceRoot)) {
    if (!/\.(?:ts|tsx|js|jsx|mjs)$/.test(file)) continue
    const source = readFileSync(file, "utf8")
    const relativeFile = path.relative(repoRoot, file).replaceAll("\\", "/")

    if (
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

// Declared but unused. A stale @workspace declaration adds a graph edge (and
// can fake a cycle) and links a package the app never loads. Apps are exempt
// for the Module Federation shared keys their vite config spreads: the
// federation plugin pre-bundles every shared key whether or not the app imports
// it, so each app must declare (and link) them all.
for (const [name, workspace] of workspaces) {
  const isApp = path.basename(path.dirname(workspace.directory)) === "apps"
  const shared = isApp ? sharedPackages(path.basename(workspace.directory) === "shell" ? shellSharedDeps : remoteSharedDeps) : new Set()
  const declaredDependencies = new Set([
    ...Object.keys(workspace.manifest.dependencies ?? {}),
    ...Object.keys(workspace.manifest.devDependencies ?? {}),
    ...Object.keys(workspace.manifest.peerDependencies ?? {}),
  ])
  const used = importedPackages(workspace.directory)
  for (const dependency of declaredDependencies) {
    if (!dependency.startsWith("@workspace/") || dependency === name || shared.has(dependency)) continue
    if (!used.has(dependency)) {
      errors.push(`${name}: declares ${dependency} but never imports it`)
    }
  }
  for (const dependency of shared) {
    if (!declaredDependencies.has(dependency)) {
      errors.push(`${name}: must declare ${dependency}, a Module Federation shared key in its vite config`)
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

// Package names whose shared entry the app must provide or link: every key
// except `import: false` consumers, subpaths folded to their package.
function sharedPackages(sharedDeps) {
  const names = new Set()
  for (const [key, options] of Object.entries(sharedDeps)) {
    if (options.import === false) continue
    names.add(packageName(key.replace(/\/$/, "")))
  }
  return names
}

function packageName(specifier) {
  const parts = specifier.split("/")
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]
}

// Every package a workspace imports anywhere (src, tests, configs, CSS), parsed
// comment-safely: static, type-only, side-effect, re-export, dynamic import()
// and require().
function importedPackages(directory) {
  const packages = new Set()
  for (const file of walkSources(directory)) {
    const source = readFileSync(file, "utf8")
    const specifiers = file.endsWith(".css")
      ? [...source.matchAll(/@import\s+["']([^"']+)["']/g)].map((match) => match[1])
      : ts.preProcessFile(source, true, true).importedFiles.map((entry) => entry.fileName)
    for (const specifier of specifiers) {
      if (!specifier.startsWith(".") && !specifier.startsWith("/")) packages.add(packageName(specifier))
    }
  }
  return packages
}

function* walkSources(directory) {
  for (const entry of readdirSync(directory)) {
    if (entry === "node_modules" || entry === "dist") continue
    const target = path.join(directory, entry)
    if (statSync(target).isDirectory()) yield* walkSources(target)
    else if (/\.(?:ts|tsx|js|jsx|mjs|cjs|css)$/.test(entry)) yield target
  }
}
