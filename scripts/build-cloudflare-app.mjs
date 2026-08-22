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

const app = process.argv[2]
if (!apps.includes(app)) {
  console.error(`Usage: bun run cf:build <${apps.join("|")}>`)
  process.exit(1)
}

const root = path.resolve(import.meta.dirname, "..")
const source = path.join(root, "apps", app, "dist")
const target = path.join(root, ".cloudflare", "dist", app)

const build = Bun.spawn(["bun", "run", "--filter", app, "build"], {
  cwd: root,
  env: { ...process.env, VITE_I18N_APP: app },
  stdout: "inherit",
  stderr: "inherit",
})

if ((await build.exited) !== 0) {
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
      "  Cache-Control: no-store",
      `/mfes/${app}/remoteEntry.ssr.js`,
      "  Cache-Control: no-store",
      `/mfes/${app}/assets/*`,
      "  Cache-Control: public, max-age=31536000, immutable",
      "",
    ].join("\n")
  )
}

console.log(`Prepared ${app} assets at ${path.relative(root, target)}`)
