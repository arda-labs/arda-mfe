// Decides which Workers deploy.yml rebuilds. Each unit is compared with the
// commit it is serving right now (the git sha in its live mfe-release.json
// buildId), not with the previous push: pushes collapsed by the concurrency
// group and units whose last deploy failed are picked up on the next run.
//
//   bun scripts/plan-cloudflare-deploy.mjs [--all]
//
// Prints {"remotes":[...],"shell":true|false} and, under GitHub Actions,
// writes `remotes` (JSON array) and `shell` to $GITHUB_OUTPUT.
import { execFileSync } from "node:child_process"
import { appendFileSync } from "node:fs"
import process from "node:process"
import { remoteNames } from "../federation.routes.ts"

/** Changes here can alter every unit's bundle or its packaging. */
const SHARED = [
  /^packages\//,
  /^scripts\//,
  /^package\.json$/,
  /^bun\.lock$/,
  /^tsconfig\.json$/,
  /^federation\.[^/]+\.ts$/,
]

/** Whether any of `files` (repo-relative, forward slashes) affects `app`. */
export function unitTouched(app, files) {
  return files.some((file) => {
    if (file.endsWith(".md")) return false
    if (SHARED.some((re) => re.test(file))) return true
    if (file.startsWith(`apps/${app}/`)) return true
    if (file === `cloudflare/wrangler.${app}.jsonc`) return true
    return app === "shell" && /^cloudflare\/shell-[^/]+\.ts$/.test(file)
  })
}

/** Git sha in a buildId such as "85dc551-1791891083269", or null. */
export function deployedSha(buildId) {
  const match = /^([0-9a-f]{7,40})-\d+$/.exec(buildId ?? "")
  return match ? match[1] : null
}

const ORIGIN = process.env.MFE_PREVIOUS_ORIGIN ?? "https://arda.io.vn"

async function liveBuildId(app) {
  const root = app === "shell" ? "" : `mfes/${app}/`
  try {
    const response = await fetch(`${ORIGIN}/${root}mfe-release.json`, { cache: "no-store" })
    if (!response.ok) return null
    return (await response.json()).buildId ?? null
  } catch {
    return null
  }
}

function changedSince(sha) {
  try {
    execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { stdio: "ignore" })
    const out = execFileSync("git", ["diff", "--name-only", sha, "HEAD"], { encoding: "utf8" })
    return out.split("\n").filter(Boolean)
  } catch {
    return null
  }
}

async function needsDeploy(app, all) {
  if (all) return { deploy: true, reason: "forced" }
  const buildId = await liveBuildId(app)
  const sha = deployedSha(buildId)
  if (!sha) return { deploy: true, reason: `no live release (${buildId ?? "unreachable"})` }
  const files = changedSince(sha)
  if (!files) return { deploy: true, reason: `live ${sha} not in history` }
  return unitTouched(app, files)
    ? { deploy: true, reason: `changed since ${sha}` }
    : { deploy: false, reason: `unchanged since ${sha}` }
}

if (import.meta.main) {
  const all = process.argv.includes("--all")
  const apps = [...remoteNames, "shell"]
  const decisions = await Promise.all(apps.map(async (app) => [app, await needsDeploy(app, all)]))
  for (const [app, { deploy, reason }] of decisions) {
    console.error(`${deploy ? "deploy" : "skip  "} ${app.padEnd(12)} ${reason}`)
  }
  const remotes = decisions.filter(([app, d]) => app !== "shell" && d.deploy).map(([app]) => app)
  const shell = decisions.some(([app, d]) => app === "shell" && d.deploy)
  console.log(JSON.stringify({ remotes, shell }))
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `remotes=${JSON.stringify(remotes)}\nshell=${shell}\n`)
  }
}
