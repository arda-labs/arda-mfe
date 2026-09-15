import { expect, test } from "bun:test"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { describeRelease, fetchPreviousRelease, fetchReleaseAsset, retainRelease, validateRelease } from "../../scripts/asset-release.mjs"

test("N-1 chunks survive while old pointers and older history do not", async () => {
  const temporaryRoot = process.env.OPENCODE_TMP ?? (process.platform === "win32" ? path.join(process.env.LOCALAPPDATA!, "Temp/opencode") : tmpdir())
  const dir = await mkdtemp(path.join(temporaryRoot, "arda-release-"))
  try {
    const old = path.join(dir, "old")
    const current = path.join(dir, "current")
    await mkdir(path.join(old, "assets"), { recursive: true })
    await mkdir(path.join(current, "assets"), { recursive: true })
    await writeFile(path.join(old, "assets/old-hash.js"), "old chunk")
    await writeFile(path.join(old, "remoteEntry.js"), "old pointer")
    const previous = await describeRelease(old, "v1")
    await writeFile(path.join(current, "assets/new-hash.js"), "new chunk")
    const release = await describeRelease(current, "v2")
    expect(await retainRelease(previous, (name: string) => readFile(path.join(old, name)), current, release)).toBe(1)
    expect(await readFile(path.join(current, "assets/old-hash.js"), "utf8")).toBe("old chunk")
    expect(release.assets.map((asset: { path: string }) => asset.path)).toEqual(["assets/new-hash.js"])
    await expect(readFile(path.join(current, "remoteEntry.js"))).rejects.toThrow()
    await expect(retainRelease(previous, async () => Buffer.from("tampered"), current, release)).rejects.toThrow("integrity")
    expect(() => validateRelease({ version: 1, assets: [{ path: "../secret" }] })).toThrow()
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test("a first rollout is recognised from 404 or an SPA fallback, and asset paths are constrained", async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = (async () => new Response("missing", { status: 404 })) as typeof fetch
    expect(await fetchPreviousRelease("https://example.test/mfes/iam/")).toBeNull()
    globalThis.fetch = (async () => new Response("<!doctype html>", { status: 200, headers: { "content-type": "text/html" } })) as typeof fetch
    expect(await fetchPreviousRelease("https://example.test/mfes/iam/")).toBeNull()
    globalThis.fetch = (async () => new Response("boom", { status: 500 })) as typeof fetch
    await expect(fetchPreviousRelease("https://example.test/mfes/iam/")).rejects.toThrow("HTTP 500")
    await expect(fetchReleaseAsset("https://example.test/", "../secrets.env")).rejects.toThrow("Invalid retained asset path")
  } finally { globalThis.fetch = original }
})
