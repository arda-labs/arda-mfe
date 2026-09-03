import { cp, mkdir, rm, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import process from "node:process"

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
]

const targetArg = process.argv[2] ?? "all"

async function buildApp(app) {
  const root = path.resolve(import.meta.dirname, "..")
  const source = path.join(root, "apps", app, "dist")
  const target = path.join(root, ".cloudflare", "dist", app)
  const appLocales = path.join(root, "apps", app, "locales")
  const coreLocales = path.join(root, "packages", "i18n", "src", "locales")

  console.log(`\n📦 [Cloudflare Build] Building and packaging: ${app}...`)

  const build = Bun.spawn(["bun", "run", "--filter", app, "build"], {
    cwd: root,
    env: process.env,
    stdout: "inherit",
    stderr: "inherit",
  })

  if ((await build.exited) !== 0) {
    console.error(`❌ Build failed for app: ${app}`)
    process.exit(1)
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

  console.log(`✅ Prepared ${app} assets at ${path.relative(root, target)}`)
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
