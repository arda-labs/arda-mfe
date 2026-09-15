import { describe, expect, test } from "bun:test"
import { Suspense } from "react"
import { renderToString } from "react-dom/server"
import { createRemoteRoutes, lazyWithPreload, retryFailedLazyLoads } from "../../packages/ui/src/lib/lazy"
import { lazyRemote } from "../../apps/shell/src/lazy-remote"
import { remoteRoutePrefixes, resolveRemoteRoute } from "../../federation.routes"

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))
describe("federation navigation", () => {
  test("a rejected render can load successfully after an explicit retry", async () => {
    let attempts = 0
    const Page = lazyWithPreload(async () => {
      if (++attempts === 1) throw new Error("offline")
      return { default: () => <p>recovered</p> }
    })
    const render = () => renderToString(<Suspense fallback="loading"><Page /></Suspense>)
    render()
    await tick()
    expect(render()).toContain("offline")
    retryFailedLazyLoads()
    render()
    await tick()
    expect(render()).toContain("recovered")
    expect(attempts).toBe(2)
  })
  test("prefetch deduplicates imports and reaches nested leaf preload", async () => {
    let imports = 0
    const paths: (string | undefined)[] = []
    const leaf = Object.assign(() => null, { preload: async (pathname?: string) => { paths.push(pathname) } })
    const Page = lazyWithPreload(async () => { imports++; return { default: leaf } })
    await Promise.all([Page.preload("/workflow/monitoring"), Page.preload("/workflow/monitoring")])
    expect(imports).toBe(1)
    expect(paths).toEqual(["/workflow/monitoring", "/workflow/monitoring"])
  })
  test("longest segment match wins and the default only covers declared prefixes", async () => {
    const loaded: string[] = []
    const page = (name: string) => lazyWithPreload(async () => { loaded.push(name); return { default: () => null } })
    const Routes = createRemoteRoutes({
      routes: [
        { prefix: "/loans/adjustments", exact: true, component: page("index") },
        { prefix: "/loans/adjustments/", component: page("kind") },
        { prefix: "/loans/adjustments/review", component: page("review") },
      ],
      defaultComponent: page("hub"), defaultPrefixes: ["/loans"],
    })
    await Routes.preload("/loans/adjustments/review")
    await Routes.preload("/loans/adjustments/interest")
    await Routes.preload("/loans/adjustments")
    await Routes.preload("/loans/adjustments-fake")
    await Routes.preload("/finance/accounts")
    expect(loaded).toEqual(["review", "kind", "index", "hub"])
  })
  test("render ownership covers every registered remote and rejects prefix lookalikes", () => {
    for (const [name, prefixes] of Object.entries(remoteRoutePrefixes)) {
      for (const prefix of prefixes) expect(resolveRemoteRoute(`${prefix}/detail`)?.name).toBe(name)
    }
    expect(resolveRemoteRoute("/admin/resource-routes")?.name).toBe("iam")
    expect(resolveRemoteRoute("/admin/oauth-clients")?.name).toBe("iam")
    expect(resolveRemoteRoute("/admin/menus")?.name).toBe("platform")
    expect(resolveRemoteRoute("/admin/users-fake")).toBeUndefined()
    expect(resolveRemoteRoute("/admin/unknown")).toBeUndefined()
  })
  test("legacy v1 remains loadable, incompatible contracts fail before rendering", async () => {
    const legacy = lazyRemote(async () => ({ default: () => null }))
    await legacy.preload("/admin/users")
    const incompatible = Object.assign(() => null, { federation: { version: 2, buildId: "future" } })
    await expect(lazyRemote(async () => ({ default: incompatible })).preload()).rejects.toThrow("Incompatible remote contract")
    await expect(lazyRemote(async () => ({})).preload()).rejects.toThrow("default React component")
  })
})
