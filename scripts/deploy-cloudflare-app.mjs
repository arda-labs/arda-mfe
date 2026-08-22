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
  console.error(`Usage: bun run cf:deploy <${apps.join("|")}>`)
  process.exit(1)
}

const root = path.resolve(import.meta.dirname, "..")
const build = Bun.spawn(["bun", "run", "cf:build", app], {
  cwd: root,
  stdout: "inherit",
  stderr: "inherit",
})

if ((await build.exited) !== 0) {
  process.exit(1)
}

const deploy = Bun.spawn(
  ["bunx", "wrangler", "deploy", "--config", `cloudflare/wrangler.${app}.jsonc`],
  { cwd: root, stdout: "inherit", stderr: "inherit" }
)

process.exit(await deploy.exited)
