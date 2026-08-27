import { cp, mkdir, rm, writeFile } from "node:fs/promises"
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
]

const targetArg = process.argv[2] ?? "all"

async function buildApp(app) {
  const root = path.resolve(import.meta.dirname, "..")
  const source = path.join(root, "apps", app, "dist")
  const target = path.join(root, ".cloudflare", "dist", app)

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
    await writeFile(
      path.join(target, "_headers"),
      [
        "/index.html",
        "  Cache-Control: no-store",
        "/assets/*",
        "  Cache-Control: public, max-age=31536000, immutable",
        "",
      ].join("\n")
    )
  } else {
    const remoteRoot = path.join(target, "mfes", app)
    await mkdir(remoteRoot, { recursive: true })
    await cp(source, remoteRoot, { recursive: true })
    await writeFile(
      path.join(target, "_headers"),
      [
        `/mfes/${app}/index.html`,
        "  Cache-Control: no-store",
        `/mfes/${app}/remoteEntry.js`,
        "  Cache-Control: public, max-age=30, s-maxage=30, stale-while-revalidate=60",
        `/mfes/${app}/remoteEntry.ssr.js`,
        "  Cache-Control: public, max-age=30, s-maxage=30, stale-while-revalidate=60",
        `/mfes/${app}/assets/*`,
        "  Cache-Control: public, max-age=31536000, immutable",
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
