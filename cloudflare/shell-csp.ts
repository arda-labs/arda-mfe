// Kept out of shell-worker.ts on purpose: workerd treats every named export of
// a Worker's main module as an entrypoint and refuses to start when one is not
// a handler/class, so the Worker may only have a default export.

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

/** Adds the CSP to HTML responses; every other response is returned as is. */
export function withShellCsp(response: Response): Response {
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
