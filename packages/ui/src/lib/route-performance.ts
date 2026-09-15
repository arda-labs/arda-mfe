export type RoutePhase = "remote-ready" | "page-ready" | "data-ready"
type NavigationTiming = {
  id: number
  pathname: string
  route: string
  remote: string
  started: number
  phases: Set<RoutePhase>
}
type TimingRegistry = { current?: NavigationTiming; sequence: number }
const key = Symbol.for("arda.route-performance.v1")
const root = globalThis as typeof globalThis & { [key]?: TimingRegistry }
const registry = (root[key] ??= { sequence: 0 })

/** Shared through a symbol because UI is bundled independently by each remote. */
export function beginRouteNavigation(pathname: string, route: string, remote: string) {
  if (typeof window === "undefined") return
  if (registry.current?.pathname === pathname) return
  registry.current = {
    id: ++registry.sequence, pathname, route, remote,
    started: performance.now(), phases: new Set(),
  }
}

export function markRoutePhase(phase: RoutePhase, pathname?: string, buildId?: string) {
  const current = registry.current
  if (typeof window === "undefined" || !current) return
  if (pathname && pathname !== current.pathname) return
  if (current.phases.has(phase)) return
  current.phases.add(phase)
  const duration = performance.now() - current.started
  const detail = {
    navigationId: current.id, route: current.route, remote: current.remote,
    phase, duration, buildId: buildId ?? "unknown",
  }
  performance.measure(`arda:${phase}`, { start: current.started, end: performance.now(), detail })
  // A bounded Performance Timeline also works when no telemetry collector is configured.
  if (performance.getEntriesByName(`arda:${phase}`).length > 50) {
    performance.clearMeasures(`arda:${phase}`)
  }
  window.dispatchEvent(new CustomEvent("arda:route-performance", { detail }))
}
