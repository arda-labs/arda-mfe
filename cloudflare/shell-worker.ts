interface Env {
  ASSETS: Fetcher
}

// Narrow CSP: enough to keep sandboxed widget iframes meaningful without
// touching script loading (remotes load chunks from other Workers).
//
// A frame's self-navigation (location.href / meta refresh / <a href>) is
// governed by the EMBEDDING page's frame-src, so `'self' blob:` here is what
// stops a sandboxed widget from exfiltrating data by navigating itself to an
// external origin. blob: stays allowed for file-preview object URLs (srcdoc
// iframes are not subject to frame-src). A dedicated widget origin must be
// added to frame-src when one exists.
export const SHELL_CSP =
  "frame-src 'self' blob:; object-src 'none'; frame-ancestors 'self'; base-uri 'self'"

function withShellCsp(response: Response): Response {
  const contentType = response.headers.get("Content-Type") ?? ""
  if (!contentType.toLowerCase().includes("text/html")) return response
  const headers = new Headers(response.headers)
  headers.set("Content-Security-Policy", SHELL_CSP)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)

    // Legacy fallback. Production has a more-specific no-script Worker route
    // for arda.io.vn/api/* and new frontend builds call api.arda.io.vn.
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return fetch(request)
    }

    return withShellCsp(await env.ASSETS.fetch(request))
  },
}
