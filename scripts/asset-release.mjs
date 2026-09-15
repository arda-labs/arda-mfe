import { createHash } from "node:crypto"
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex")
const assetPath = /^(?:assets\/[\w.-]+|remoteEntry-[\w-]+\.js)$/
export function validateRelease(release) {
  if (release?.version !== 1 || !Array.isArray(release.assets) || release.assets.length > 1000) throw new Error("Invalid asset release manifest")
  let bytes = 0
  const paths = new Set()
  for (const asset of release.assets) {
    if (!assetPath.test(asset.path) || paths.has(asset.path) || !/^[a-f0-9]{64}$/.test(asset.sha256) || !Number.isSafeInteger(asset.size) || asset.size < 0) throw new Error("Invalid release asset")
    paths.add(asset.path)
    bytes += asset.size
  }
  if (bytes > 30 * 1024 * 1024) throw new Error("Previous release exceeds retention budget")
  return release
}

export async function describeRelease(directory, buildId) {
  const assets = []
  async function scan(relative = "") {
    for (const entry of await readdir(path.join(directory, relative), { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name
      if (entry.isDirectory() && name === "assets") await scan(name)
      else if (entry.isFile() && assetPath.test(name)) {
        const bytes = await readFile(path.join(directory, name))
        assets.push({ path: name, size: bytes.length, sha256: digest(bytes) })
      }
    }
  }
  await scan()
  return validateRelease({ version: 1, contractVersion: 1, buildId, assets })
}

/** Keep N-1 immutable assets, not old HTML/remoteEntry pointers or unbounded history. */
export async function retainRelease(release, readAsset, target, current) {
  validateRelease(release)
  const currentPaths = new Set(current.assets.map((asset) => asset.path))
  const assets = release.assets.filter((asset) => !currentPaths.has(asset.path))
  let next = 0
  await Promise.all(Array.from({ length: Math.min(4, assets.length) }, async () => {
    for (;;) {
      const asset = assets[next++]
      if (!asset) return
      const bytes = await readAsset(asset.path)
      if (bytes.length !== asset.size || digest(bytes) !== asset.sha256) throw new Error(`Previous asset integrity mismatch: ${asset.path}`)
      const output = path.join(target, asset.path)
      await mkdir(path.dirname(output), { recursive: true })
      await writeFile(output, bytes)
    }
  }))
  return assets.length
}

export async function fetchPreviousRelease(baseURL) {
  const response = await fetch(new URL("mfe-release.json", baseURL), { signal: AbortSignal.timeout(15_000), cache: "no-store" })
  if (response.status === 404 || (response.ok && response.headers.get("content-type")?.includes("text/html"))) return null // First rollout, including legacy SPA fallback.
  if (!response.ok) throw new Error(`Cannot read previous release: HTTP ${response.status}`)
  return validateRelease(await response.json())
}

export async function fetchReleaseAsset(baseURL, filename) {
  if (!assetPath.test(filename)) throw new Error("Invalid retained asset path")
  const response = await fetch(new URL(filename, baseURL), { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`Cannot retain ${filename}: HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}
