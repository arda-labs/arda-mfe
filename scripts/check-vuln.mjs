// Fails on a JavaScript dependency advisory that is not explicitly accepted in
// scripts/vuln-allowlist.json.
//
// Why this exists: the audit found several advisories in arda-mfe and, separately,
// none of the four CI workflows ran a dependency check at all. `bun audit` exits
// non-zero on any advisory, so dropping it into the workflow as-is would have
// left the build permanently red and taught everyone to ignore it. This gate
// keeps the signal: an unknown advisory fails, and a known one has to carry a
// reason and a review date.
//
// The current findings are all transitive and reach no browser code, so
// they are accepted explicitly rather than waved through. See the allowlist.

import { readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { execFileSync } from "node:child_process"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const allowlistPath = join(root, "scripts/vuln-allowlist.json")

const raw = (await readFile(allowlistPath, "utf8")).replace(/^﻿/, "")
let allowlist
try {
  allowlist = JSON.parse(raw)
} catch (e) {
  console.error(`${allowlistPath} is not valid JSON: ${e.message}`)
  process.exit(1)
}
const accepted = new Map((allowlist.accepted ?? []).map((a) => [a.url ?? a.id, a]))

const required = ["id", "package", "severity", "scope", "reason", "revisitWhen", "reviewed"]
const incomplete = []
for (const entry of accepted.values()) {
  for (const field of required) {
    const value = entry[field]
    if (value === undefined || value === null || value === "") {
      incomplete.push(`${entry.id ?? "<missing id>"}: accepted entries must declare "${field}"`)
    }
  }
}
if (incomplete.length) {
  console.error(`vuln allowlist entries are incomplete:\n${incomplete.join("\n")}`)
  process.exit(1)
}

const today = new Date()
const stale = []
for (const entry of accepted.values()) {
  if (!entry.reviewBy) {
    stale.push(`${entry.id}: accepted without a reviewBy date`)
    continue
  }
  const due = new Date(entry.reviewBy)
  if (!Number.isNaN(due.getTime()) && due < today) {
    stale.push(`${entry.id}: reviewBy ${entry.reviewBy} has passed; re-assess or bump the dependency`)
  }
}
if (stale.length) {
  console.error(`vuln allowlist is stale:\n${stale.join("\n")}`)
  process.exit(1)
}

// bun prints its version banner on stdout even with --json, so the document has
// to be sliced out rather than parsed whole.
const run = () => {
  try {
    const out = execFileSync("bun", ["audit", "--json"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    })
    return out
  } catch (e) {
    return `${e.stdout ?? ""}${e.stderr ?? ""}`
  }
}

const output = run().replace(/\[[0-9;]*m/g, "") // strip ANSI colour
const start = output.indexOf('{"')
if (start === -1) {
  console.error(`could not parse bun audit output:\n${output.split("\n").slice(0, 8).join("\n")}`)
  process.exit(1)
}

// bun appends a human-readable summary after the JSON document, so the document
// has to be delimited by brace matching rather than by "everything from the
// first brace". String-aware, because an advisory title can contain a brace.
const document = extractJsonObject(output, start)
if (!document) {
  console.error(`could not find the end of the bun audit JSON document:\n${output.split("\n").slice(0, 8).join("\n")}`)
  process.exit(1)
}

let report
try {
  report = JSON.parse(document)
} catch (e) {
  console.error(`bun audit output is not valid JSON: ${e.message}`)
  process.exit(1)
}

// Returns the balanced {...} starting at `start`, or null if it never closes.
function extractJsonObject(text, start) {
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === "\\") escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === "{") depth += 1
    else if (ch === "}") {
      depth -= 1
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

const unaccepted = []
const stillPresent = new Set()
let total = 0

for (const [pkg, advisories] of Object.entries(report)) {
  for (const advisory of advisories ?? []) {
    total += 1
    const url = advisory.url ?? advisory.id
    const entry = accepted.get(url)
    if (entry) {
      stillPresent.add(entry.id)
      // A transitive dependency can move, so confirm the advisory is still the
      // one that was accepted rather than a different issue at the same URL.
      if (entry.package && entry.package !== pkg) {
        unaccepted.push(
          `${advisory.id} is reported under "${pkg}" but the allowlist accepted it for "${entry.package}"`,
        )
      }
      continue
    }
    unaccepted.push(
      `${advisory.id} (${advisory.severity}) ${pkg}: ${advisory.title ?? ""}\n    ${url}`,
    )
  }
}

if (unaccepted.length) {
  console.error(
    `Unaccepted dependency advisories (${unaccepted.length} of ${total}):\n${unaccepted.join("\n")}\n\n` +
      "Bump the dependency, or add an entry to scripts/vuln-allowlist.json with the reason " +
      "and a review date.",
  )
  process.exit(1)
}

const summary = stillPresent.size > 0 ? ` Still present and accepted: ${[...stillPresent].join(", ")}.` : ""
console.log(
  `Dependency audit OK: ${total} advisory(ies) reported, all accepted.${summary}`,
)
