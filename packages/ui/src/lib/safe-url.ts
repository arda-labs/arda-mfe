// URL scheme allowlists for values that reach an `href`, a `src`, or
// `window.location`.
//
// Every helper here exists because an *origin* check is not a *scheme* check.
// `new URL("javascript:alert(1)", location.origin)` parses successfully and
// reports `origin === "null"`, so code shaped like
//
//   if (url.origin === location.origin) navigate(...)
//   else window.location.assign(url.href)
//
// sends a `javascript:` URL down the `else` branch and executes it in the app
// origin. The only reliable gate is an explicit protocol allowlist, applied
// before the value is used, at the boundary rather than at the sink.

const WEB_PROTOCOLS = new Set(["http:", "https:"])

/**
 * Allowlist `http:`/`https:` for a value used as an external link target.
 * Returns "" when the value is empty, unparseable, or uses any other scheme
 * (javascript:, data:, vbscript:, blob:, file:).
 */
export function safeExternalHref(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim()
  if (!trimmed) return ""
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return ""
  }
  return WEB_PROTOCOLS.has(url.protocol) ? url.href : ""
}

export type SafeHref =
  | { kind: "internal"; href: string }
  | { kind: "external"; href: string }
  | { kind: "blocked" }

/**
 * Classify a possibly-relative href against the current origin.
 *
 * Internal values are returned as a path so they can go through the SPA router
 * rather than a full page load. External values are only ever `https:`, and
 * they are meant to be opened in a fresh context by the caller — never assigned
 * to `window.location`, which would let the target reach back through
 * `window.opener`.
 */
export function classifyHref(
  value: string | null | undefined,
  origin: string,
): SafeHref {
  const trimmed = (value ?? "").trim()
  if (!trimmed) return { kind: "blocked" }
  let url: URL
  try {
    url = new URL(trimmed, origin)
  } catch {
    return { kind: "blocked" }
  }
  if (url.origin === origin) {
    return { kind: "internal", href: `${url.pathname}${url.search}${url.hash}` }
  }
  // Only https off-origin. `http:` is refused here because the app itself is
  // served over TLS: an off-origin http link is a downgrade, not a peer.
  if (url.protocol === "https:") return { kind: "external", href: url.href }
  return { kind: "blocked" }
}
