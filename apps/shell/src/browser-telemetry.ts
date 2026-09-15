import { getBuildId } from "@workspace/ui/lib/federation-contract"
import type { BrowserErrorReport } from "@workspace/ui/observability/browser-telemetry"
import { resolveRemoteRoute } from "../../../federation.routes"

/** Bounded diagnostics in-session, plus optional batch export to a configured collector. */
export function installBrowserTelemetry() {
  const samples: unknown[] = []
  const pending: unknown[] = []
  const configured = import.meta.env.VITE_BROWSER_TELEMETRY_URL as string | undefined
  let endpoint: URL | undefined
  if (configured) {
    try {
      endpoint = new URL(configured, location.origin)
    } catch {
      // A malformed collector URL must never break shell boot.
      endpoint = undefined
    }
  }
  const record = (sample: Record<string, unknown>) => {
    const value = { ...sample, shellBuildId: getBuildId(), time: Date.now() }
    samples.push(value)
    if (samples.length > 100) samples.shift()
    try { sessionStorage.setItem("arda:telemetry", JSON.stringify(samples)) } catch { /* storage may be disabled */ }
    if (endpoint) { pending.push(value); if (pending.length > 100) pending.shift() }
  }
  const error = (event: Event) => {
    const detail = (event as CustomEvent<BrowserErrorReport>).detail
    const route = resolveRemoteRoute(location.pathname)
    record({ kind: detail.kind, name: detail.name, message: detail.message,
      route: route ? `${route.prefix}/*` : "/", remote: route?.name ?? "shell" })
  }
  const timing = (event: Event) => record({ kind: "route-performance", ...(event as CustomEvent<Record<string, unknown>>).detail })
  const flush = () => {
    if (!endpoint || !pending.length) return
    const body = JSON.stringify({ version: 1, events: pending.splice(0, 20) })
    // Supports a cookie-backed collector on the configured BFF origin.
    void fetch(endpoint.href, {
      method: "POST", body, headers: { "Content-Type": "application/json" },
      credentials: "include", keepalive: true, signal: AbortSignal.timeout(5000),
    }).catch(() => undefined)
  }
  const resource = (event: Event) => {
    const target = event.target
    const url = target instanceof HTMLScriptElement ? target.src : target instanceof HTMLLinkElement ? target.href : undefined
    if (url) record({ kind: "asset-load", asset: new URL(url).pathname })
  }
  const timer = setInterval(flush, 10_000)
  window.addEventListener("arda:browser-error", error)
  window.addEventListener("arda:route-performance", timing)
  window.addEventListener("error", resource, true)
  window.addEventListener("pagehide", flush)
  return () => {
    clearInterval(timer)
    window.removeEventListener("arda:browser-error", error)
    window.removeEventListener("arda:route-performance", timing)
    window.removeEventListener("error", resource, true)
    window.removeEventListener("pagehide", flush)
  }
}
