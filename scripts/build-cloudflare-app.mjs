import { cp, mkdir, rm, writeFile, readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import process from "node:process"
import { execFileSync } from "node:child_process"
import { describeRelease, fetchPreviousRelease, fetchReleaseAsset, retainRelease } from "./asset-release.mjs"

const apps = [
  "shell",
  "iam",
  "platform",
  "finance",
  "account",
  "hrm",
  "workflow",
  "crm",
  "ai",
  "loan",
  "mdm",
  "deposit",
  "capital",
  "statistical",
]

const targetArg = process.argv[2] ?? "all"
function resolveBuildId() {
  if (process.env.VITE_MFE_BUILD_ID) return process.env.VITE_MFE_BUILD_ID
  try {
    return `${execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim()}-${Date.now()}`
  } catch {
    return `local-${Date.now()}`
  }
}
const buildId = resolveBuildId()

async function buildApp(app) {
  const root = path.resolve(import.meta.dirname, "..")
  const source = path.join(root, "apps", app, "dist")
  const target = path.join(root, ".cloudflare", "dist", app)
  const appLocales = path.join(root, "apps", app, "locales")
  const coreLocales = path.join(root, "packages", "i18n", "src", "locales")
  const relativeRoot = app === "shell" ? "" : `mfes/${app}`
  const previousRoot = path.join(target, relativeRoot)
  const staging = path.join(root, ".cloudflare", "retained", app)

  console.log(`\n📦 [Cloudflare Build] Building and packaging: ${app}...`)

  const build = Bun.spawn(["bun", "run", "--filter", app, "build"], {
    cwd: root,
    env: { ...process.env, VITE_MFE_BUILD_ID: buildId },
    stdout: "inherit",
    stderr: "inherit",
  })

  if ((await build.exited) !== 0) {
    console.error(`❌ Build failed for app: ${app}`)
    process.exit(1)
  }

  const current = await describeRelease(source, buildId)
  let previous = null
  let readPreviousAsset
  // CI/Workers Builds use the deployed manifest; local builds can reuse their last output.
  // Retention is best-effort: a collector/network hiccup must never break a deploy.
  const previousOrigin = process.env.MFE_PREVIOUS_ORIGIN ?? ((process.env.CI || process.env.CF_BUILD_ID || process.env.WORKERS_CI) ? "https://arda.io.vn" : "")
  if (previousOrigin && previousOrigin !== "off") {
    try {
      const base = new URL(`${relativeRoot}/`.replace(/^\//, ""), `${previousOrigin.replace(/\/$/, "")}/`)
      previous = await fetchPreviousRelease(base)
      readPreviousAsset = (filename) => fetchReleaseAsset(base, filename)
    } catch (error) {
      console.warn(`⚠️  ${app}: cannot read the deployed release (${error instanceof Error ? error.message : error}); skipping N-1 retention`)
      previous = null
      readPreviousAsset = undefined
    }
  } else if (existsSync(path.join(previousRoot, "mfe-release.json"))) {
    previous = JSON.parse(await readFile(path.join(previousRoot, "mfe-release.json"), "utf8"))
    readPreviousAsset = (filename) => readFile(path.join(previousRoot, filename))
  }
  await rm(staging, { recursive: true, force: true })
  await mkdir(staging, { recursive: true })
  if (previous && readPreviousAsset) {
    try {
      await retainRelease(previous, readPreviousAsset, staging, current)
    } catch (error) {
      console.warn(`⚠️  ${app}: N-1 retention incomplete (${error instanceof Error ? error.message : error})`)
    }
  }
  await rm(target, { recursive: true, force: true })
  await mkdir(target, { recursive: true })

  if (app === "shell") {
    await cp(source, target, { recursive: true })

    // Copy core and shell locales
    if (existsSync(coreLocales)) {
      await cp(coreLocales, path.join(target, "locales"), { recursive: true })
    }
    if (existsSync(appLocales)) {
      await cp(appLocales, path.join(target, "locales", "shell"), { recursive: true })
    }

    await writeFile(
      path.join(target, "_headers"),
      [
        "/index.html",
        "  Cache-Control: no-store",
        "/mfe-release.json",
        "  Cache-Control: no-store",
        "/locales/*",
        "  Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        "  Access-Control-Allow-Origin: *",
        "/assets/*",
        "  Cache-Control: public, max-age=31536000, immutable",
        "",
      ].join("\n")
    )
  } else {
    const remoteRoot = path.join(target, "mfes", app)
    await mkdir(remoteRoot, { recursive: true })
    await cp(source, remoteRoot, { recursive: true })

    // Copy app-specific locales
    if (existsSync(appLocales)) {
      await cp(appLocales, path.join(remoteRoot, "locales"), { recursive: true })
    }

    await writeFile(
      path.join(target, "_headers"),
      [
        `/mfes/${app}/index.html`,
        "  Cache-Control: no-store",
        `/mfes/${app}/mfe-release.json`,
        "  Cache-Control: no-store",
        `/mfes/${app}/remoteEntry.js`,
        "  Cache-Control: public, max-age=30, s-maxage=30, stale-while-revalidate=60",
        "  Access-Control-Allow-Origin: *",
        `/mfes/${app}/remoteEntry.ssr.js`,
        "  Cache-Control: public, max-age=30, s-maxage=30, stale-while-revalidate=60",
        "  Access-Control-Allow-Origin: *",
        `/mfes/${app}/locales/*`,
        "  Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        "  Access-Control-Allow-Origin: *",
        `/mfes/${app}/assets/*`,
        "  Cache-Control: public, max-age=31536000, immutable",
        "  Access-Control-Allow-Origin: *",
        "",
      ].join("\n")
    )
  }

  const outputRoot = path.join(target, relativeRoot)
  await cp(staging, outputRoot, { recursive: true })
  await rm(staging, { recursive: true, force: true })
  await writeFile(path.join(outputRoot, "mfe-release.json"), JSON.stringify({ ...current, previousBuildId: previous?.buildId }))
  console.log(`✅ Prepared ${app} assets at ${path.relative(root, target)} (${buildId})`)
}

if (targetArg === "all") {
  console.log(`🚀 Building Cloudflare assets for all ${apps.length} apps: ${apps.join(", ")}`)
  for (const a of apps) {
    await buildApp(a)
  }
  console.log(`\n🎉 All ${apps.length} Cloudflare app assets built successfully!`)
} else if (apps.includes(targetArg)) {
  await buildApp(targetArg)
} else {
  console.error(`Usage: bun run cf:build <all|${apps.join("|")}>`)
  process.exit(1)
}
