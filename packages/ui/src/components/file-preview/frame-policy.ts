/**
 * Whether a preview source may be loaded in an inline `<iframe>`.
 *
 * The shell serves `frame-src 'self' blob:`, so only blob: URLs and
 * same-origin documents can be framed. We are stricter than the header for
 * blob: and require the embedded origin (`blob:<origin>/<uuid>`, what
 * `URL.createObjectURL` yields) to be the current origin; opaque
 * `blob:null/...` URLs are denied. Anything else (external hosts,
 * `javascript:`/`data:` URLs, malformed input) must fall back to opening the
 * source in a new top-level tab, which frame-src does not govern.
 */
export function canFrameSource(src: string, currentOrigin: string): boolean {
  if (!src.trim()) return false
  try {
    const url = new URL(src, currentOrigin)
    if (url.protocol === "blob:") {
      return new URL(url.pathname).origin === new URL(currentOrigin).origin
    }
    return url.origin === new URL(currentOrigin).origin
  } catch {
    return false
  }
}
