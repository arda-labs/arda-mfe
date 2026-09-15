// Serves the packaged Cloudflare output for browser regression tests:
//   /mfes/<app>/* -> .cloudflare/dist/<app>/mfes/<app>/*
//   everything else -> .cloudflare/dist/shell/* with SPA fallback
import { createReadStream, existsSync, statSync } from "node:fs"
import { createServer } from "node:http"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "../..")
const distRoot = path.join(root, ".cloudflare", "dist")
const port = Number(process.env.PORT ?? 4199)

// Prefer the packaged Cloudflare output; CI runs `build:apps` and falls back to
// the raw Vite dist folders, which share the same /mfes/<app> URL contract.
function directoryFor(app) {
  const packaged = app === "shell" ? path.join(distRoot, "shell") : path.join(distRoot, app, "mfes", app)
  if (existsSync(packaged)) return packaged
  return path.join(root, "apps", app, "dist")
}

const shellRoot = directoryFor("shell")

const types = {
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
}

function resolveRequest(pathname) {
  if (pathname.startsWith("/mfes/")) {
    const segments = pathname.split("/").filter(Boolean)
    const app = segments[1]
    if (!app) return undefined
    return { base: directoryFor(app), relative: segments.slice(2).join("/") }
  }
  return { base: shellRoot, relative: pathname.replace(/^\//, "") }
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`)
  const target = resolveRequest(decodeURIComponent(url.pathname))
  if (!target) {
    response.writeHead(404).end("Not found")
    return
  }
  let file = path.join(target.base, target.relative || "index.html")
  if (!file.startsWith(target.base)) {
    response.writeHead(403).end("Forbidden")
    return
  }
  if (!existsSync(file) || statSync(file).isDirectory()) {
    if (target.base !== shellRoot) {
      response.writeHead(404).end("Not found")
      return
    }
    file = path.join(shellRoot, "index.html")
  }
  response.writeHead(200, {
    "Content-Type": types[path.extname(file).toLowerCase()] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  })
  createReadStream(file).pipe(response)
})

server.listen(port, "127.0.0.1", () => {
  console.log(`[browser-test] serving ${distRoot} on http://127.0.0.1:${port}`)
})
