// Negative tests for scripts/check-vuln.mjs. Run from the repo root:
//   node scripts/check-vuln.test.mjs
// These drive the allowlist half only, so they stay fast; the audit itself runs
// in the vulnerabilities workflow.

import { readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { execFileSync } from "node:child_process"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const target = join(root, "scripts/vuln-allowlist.json")

const run = () => {
  try {
    const out = execFileSync("node", ["scripts/check-vuln.mjs"], {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
      maxBuffer: 64 * 1024 * 1024,
    })
    return { code: 0, out }
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` }
  }
}

let failures = 0
function expect(name, cond, detail = "") {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    failures += 1
    console.log(`  FAIL  ${name}${detail ? `\n${detail.trim().slice(0, 600)}` : ""}`)
  }
}

const original = await readFile(target, "utf8")
const base = JSON.parse(original.replace(/^﻿/, ""))

try {
  console.log("check-vuln (mfe): negative tests")

  const baseline = run()
  expect("the committed allowlist passes", baseline.code === 0, baseline.out)

  // Dropping an accepted entry must surface the advisory again.
  const dropped = structuredClone(base)
  dropped.accepted = dropped.accepted.filter((e) => e.id !== "GHSA-w5hq-g745-h8pq")
  await writeFile(target, JSON.stringify(dropped, null, 2), "utf8")
  const missing = run()
  expect(
    "an unaccepted advisory fails",
    missing.code === 1 && /GHSA-w5hq-g745-h8pq/.test(missing.out) && /Unaccepted/.test(missing.out),
    missing.out,
  )

  // An exception past its review date must fail.
  const expired = structuredClone(base)
  expired.accepted[0].reviewBy = "2020-01-01"
  await writeFile(target, JSON.stringify(expired, null, 2), "utf8")
  const stale = run()
  expect("an expired reviewBy fails", stale.code === 1 && /has passed/.test(stale.out), stale.out)

  // An entry that does not say why it is accepted is not reviewable.
  for (const field of ["reason", "scope", "revisitWhen"]) {
    const bare = structuredClone(base)
    delete bare.accepted[0][field]
    await writeFile(target, JSON.stringify(bare, null, 2), "utf8")
    const r = run()
    expect(`an entry missing "${field}" fails`, r.code === 1 && new RegExp(field).test(r.out), r.out)
  }

  // A malformed allowlist must say so rather than throw.
  await writeFile(target, "{ nope", "utf8")
  const broken = run()
  expect(
    "a malformed allowlist is reported clearly",
    broken.code === 1 && /is not valid JSON/.test(broken.out),
    broken.out,
  )

  // Edited on Windows as often as Linux.
  await writeFile(target, `﻿${original}`, "utf8")
  const bom = run()
  expect("a BOM is tolerated", bom.code === 0, bom.out)
} finally {
  await writeFile(target, original, "utf8")
}

const restored = run()
expect("the allowlist is restored and passing", restored.code === 0, restored.out)

console.log(failures === 0 ? "\ncheck-vuln (mfe): all negative tests passed" : `\ncheck-vuln (mfe): ${failures} failure(s)`)
process.exit(failures === 0 ? 0 : 1)
