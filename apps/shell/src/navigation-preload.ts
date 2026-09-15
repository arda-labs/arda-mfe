import { preloadRemoteForPath } from "./remote-routes"
import { resolveRemoteRoute } from "../../../federation.routes"
import { beginRouteNavigation } from "@workspace/ui/lib/route-performance"

let intentTimer: ReturnType<typeof setTimeout> | undefined
let speculativePending = false
const loads = new Map<string, Promise<void>>()
function preload(pathname: string) {
  const existing = loads.get(pathname)
  if (existing) return existing
  const pending = preloadRemoteForPath(pathname).finally(() => loads.delete(pathname))
  loads.set(pathname, pending)
  return pending
}
export function preloadNavigation(pathname: string) {
  clearTimeout(intentTimer)
  const route = resolveRemoteRoute(pathname)
  beginRouteNavigation(pathname, route ? `${route.prefix}/*` : "/", route?.name ?? "shell")
  // Code only: queries are owned by the authenticated remote provider.
  return preload(pathname).catch(() => undefined)
}
export function scheduleRemotePreload(href: string) {
  clearTimeout(intentTimer)
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  if (connection?.saveData || connection?.effectiveType === "2g") return
  const url = new URL(href, location.origin)
  if (url.origin !== location.origin || !resolveRemoteRoute(url.pathname)) return
  intentTimer = setTimeout(() => {
    // One speculative import leaves capacity for the selected navigation.
    if (speculativePending) return
    speculativePending = true
    void preload(url.pathname).catch(() => undefined).finally(() => { speculativePending = false })
  }, 150)
}
export function installNavigationPreload() {
  const intent = (event: Event) => {
    const element = event.target instanceof Element ? event.target.closest("a[href], [data-preload-href]") : null
    const href = element?.getAttribute("data-preload-href") ?? element?.getAttribute("href")
    if (href) scheduleRemotePreload(href)
  }
  const navigate = (event: Event) => {
    const href = (event as CustomEvent<string>).detail
    if (typeof href !== "string") return
    const url = new URL(href, location.origin)
    if (url.origin === location.origin) void preloadNavigation(url.pathname)
  }
  document.addEventListener("pointerover", intent)
  document.addEventListener("focusin", intent)
  window.addEventListener("arda:navigation-intent", navigate)
  return () => {
    clearTimeout(intentTimer)
    document.removeEventListener("pointerover", intent)
    document.removeEventListener("focusin", intent)
    window.removeEventListener("arda:navigation-intent", navigate)
  }
}
