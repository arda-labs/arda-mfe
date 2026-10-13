/**
 * Whether a preview source may be loaded in an inline `<iframe>`.
 *
 * The shell serves `frame-src 'self' blob:`, so only blob: URLs and
 * same-origin documents can be framed. Anything else (external hosts,
 * `javascript:`/`data:` URLs, malformed input) must fall back to opening the
 * source in a new top-level tab, which frame-src does not govern.
 */
export function canFrameSource(src: string, currentOrigin: string): boolean {
  if (!src.trim()) return false
  try {
    const url = new URL(src, currentOrigin)
    if (url.protocol === "blob:") return true
    return url.origin === new URL(currentOrigin).origin
  } catch {
    return false
  }
}
