import { afterEach, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import worker from "../../cloudflare/shell-worker"
import { SHELL_CSP } from "../../cloudflare/shell-csp"

const EXPECTED =
  "frame-src 'self' blob:; object-src 'none'; frame-ancestors 'self'; base-uri 'self'"

function env(response: Response) {
  const seen: Request[] = []
  const ASSETS = {
    fetch: (request: Request) => {
      seen.push(request)
      return Promise.resolve(response)
    },
  } as unknown as Fetcher
  return { env: { ASSETS }, seen }
}

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

test("the policy has each directive exactly once and never touches script loading", () => {
  const directives = SHELL_CSP.split(";").map((d) => d.trim().split(/\s+/)[0])
  expect(directives.sort()).toEqual(["base-uri", "frame-ancestors", "frame-src", "object-src"])
  expect(SHELL_CSP).toContain("frame-src 'self' blob:")
  expect(SHELL_CSP).not.toMatch(/script-src|default-src|connect-src|style-src/)
})

test("default is the Worker's only export (workerd rejects named exports)", async () => {
  expect(Object.keys(await import("../../cloudflare/shell-worker"))).toEqual(["default"])
})

// Static assets are served before the Worker unless run_worker_first matches,
// in which case the CSP never reaches HTML documents. Guard the routing config.
function runWorkerFirst(): string[] {
  const text = readFileSync(new URL("../../cloudflare/wrangler.shell.jsonc", import.meta.url), "utf8")
  // Strip JSONC comments but keep string literals ("/*" is a legitimate value).
  const json = text.replace(/("(?:[^"\\]|\\.)*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (_m, str) => str ?? "")
  const rules = JSON.parse(json).assets.run_worker_first
  return Array.isArray(rules) ? rules : []
}

test("wrangler.shell.jsonc runs the Worker first for HTML but not hashed static dirs", () => {
  const rules = runWorkerFirst()
  expect(rules).toContain("/*")
  for (const excluded of ["!/assets/*", "!/locales/*"]) expect(rules).toContain(excluded)
})

test("HTML responses get exactly the narrow CSP", async () => {
  const { env: e } = env(new Response("<html></html>", { headers: { "Content-Type": "text/html" } }))
  const res = await worker.fetch(new Request("https://arda.io.vn/"), e)
  expect(res.headers.get("Content-Security-Policy")).toBe(EXPECTED)
})

test("a charset parameter and mixed case still count as HTML", async () => {
  for (const type of ["text/html; charset=utf-8", "Text/HTML;charset=UTF-8"]) {
    const { env: e } = env(new Response("<html></html>", { headers: { "Content-Type": type } }))
    const res = await worker.fetch(new Request("https://arda.io.vn/some/spa/route"), e)
    expect(res.headers.get("Content-Security-Policy")).toBe(EXPECTED)
  }
})

test("rewritten HTML keeps status, statusText, other headers and body", async () => {
  const { env: e } = env(
    new Response("<html>hi</html>", {
      status: 404,
      statusText: "Not Found",
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Custom": "kept",
      },
    }),
  )
  const res = await worker.fetch(new Request("https://arda.io.vn/missing"), e)
  expect(res.status).toBe(404)
  expect(res.statusText).toBe("Not Found")
  expect(res.headers.get("Cache-Control")).toBe("no-store")
  expect(res.headers.get("X-Custom")).toBe("kept")
  expect(res.headers.get("Content-Type")).toBe("text/html; charset=utf-8")
  expect(await res.text()).toBe("<html>hi</html>")
})

test("an existing CSP on an HTML response is replaced, not duplicated", async () => {
  const { env: e } = env(
    new Response("<html></html>", {
      headers: { "Content-Type": "text/html", "Content-Security-Policy": "default-src *" },
    }),
  )
  const res = await worker.fetch(new Request("https://arda.io.vn/"), e)
  expect(res.headers.get("Content-Security-Policy")).toBe(EXPECTED)
})

test("non-HTML assets pass through untouched without the header", async () => {
  const types = [
    "application/javascript",
    "text/css",
    "application/json",
    "image/png",
    "image/svg+xml",
    "application/pdf",
  ]
  for (const type of types) {
    const original = new Response("payload", { status: 200, headers: { "Content-Type": type } })
    const { env: e } = env(original)
    const res = await worker.fetch(new Request("https://arda.io.vn/assets/x"), e)
    expect(res).toBe(original)
    expect(res.headers.get("Content-Security-Policy")).toBeNull()
  }
})

test("a response without Content-Type is not treated as HTML", async () => {
  const original = new Response(null, { status: 304 })
  const { env: e } = env(original)
  const res = await worker.fetch(new Request("https://arda.io.vn/x"), e)
  expect(res).toBe(original)
  expect(res.headers.get("Content-Security-Policy")).toBeNull()
})

test("/api and /api/* bypass ASSETS and are returned unchanged", async () => {
  const calls: string[] = []
  globalThis.fetch = ((input: Request | string | URL) => {
    calls.push(input instanceof Request ? input.url : String(input))
    return Promise.resolve(new Response("{}", { headers: { "Content-Type": "text/html" } }))
  }) as typeof fetch
  const { env: e, seen } = env(new Response("assets"))
  for (const path of ["/api", "/api/users"]) {
    const res = await worker.fetch(new Request(`https://arda.io.vn${path}`), e)
    expect(res.headers.get("Content-Security-Policy")).toBeNull()
  }
  expect(calls).toEqual(["https://arda.io.vn/api", "https://arda.io.vn/api/users"])
  expect(seen).toHaveLength(0)
})
