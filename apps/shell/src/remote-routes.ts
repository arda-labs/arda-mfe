import { remoteRoutePrefixes, resolveRemoteRoute, type RemoteName } from "../../../federation.routes"
import { lazyRemote, type PreloadableRemote } from "./lazy-remote"

export const remoteComponents: Record<RemoteName, PreloadableRemote> = {
  iam: lazyRemote(() => import("iam/Routes")),
  platform: lazyRemote(() => import("platform/Routes")),
  finance: lazyRemote(() => import("finance/Routes")),
  hrm: lazyRemote(() => import("hrm/Routes")),
  account: lazyRemote(() => import("account/Routes")),
  crm: lazyRemote(() => import("crm/Routes")),
  workflow: lazyRemote(() => import("workflow/Routes")),
  ai: lazyRemote(() => import("ai/Routes")),
  loan: lazyRemote(() => import("loan/Routes")),
  mdm: lazyRemote(() => import("mdm/Routes")),
  deposit: lazyRemote(() => import("deposit/Routes")),
  capital: lazyRemote(() => import("capital/Routes")),
  statistical: lazyRemote(() => import("statistical/Routes")),
}
export const remoteRouteEntries = Object.entries(remoteRoutePrefixes).flatMap(([name, prefixes]) =>
  prefixes.map((prefix) => ({ path: `${prefix}/*`, component: remoteComponents[name as RemoteName] }))
)

export function preloadRemoteForPath(pathname: string) {
  const match = resolveRemoteRoute(pathname)
  return match ? remoteComponents[match.name].preload(pathname) : Promise.resolve()
}
