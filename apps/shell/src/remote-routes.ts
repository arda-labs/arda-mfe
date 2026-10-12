import { remoteNames, remoteRoutePrefixes, resolveRemoteRoute, type RemoteName } from "../../../federation.routes"
import { lazyRemote, type PreloadableRemote } from "./lazy-remote"
import { remoteRouteModules } from "./remote-route-modules.generated"

export const remoteComponents = Object.fromEntries(
  remoteNames.map((name) => [name, lazyRemote(remoteRouteModules[name])])
) as Record<RemoteName, PreloadableRemote>
export const remoteRouteEntries = Object.entries(remoteRoutePrefixes).flatMap(([name, prefixes]) =>
  prefixes.map((prefix) => ({ path: `${prefix}/*`, component: remoteComponents[name as RemoteName] }))
)

export function preloadRemoteForPath(pathname: string) {
  const match = resolveRemoteRoute(pathname)
  return match ? remoteComponents[match.name].preload(pathname) : Promise.resolve()
}
