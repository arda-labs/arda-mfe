import type { ComponentType } from "react"
import { lazyWithPreload } from "@workspace/ui/lib/lazy"
import { ROUTES_CONTRACT_VERSION } from "@workspace/ui/lib/federation-contract"
import { markRoutePhase } from "@workspace/ui/lib/route-performance"

type RemoteComponent = ComponentType & {
  preload?: (pathname?: string) => Promise<void>
  federation?: { version: number; buildId: string }
}
type RemoteModule = { default?: RemoteComponent; preload?: RemoteComponent["preload"] }
export type PreloadableRemote = ComponentType & { preload: (pathname?: string) => Promise<void> }

export function lazyRemote(load: () => Promise<RemoteModule>): PreloadableRemote {
  let modulePromise: Promise<{ default: RemoteComponent }> | null = null
  let preloadRemote: RemoteComponent["preload"]
  const loadModule = () => {
    modulePromise ??= load().then((module) => {
      const component = module.default
      if (!component || (typeof component !== "function" && typeof component !== "object")) {
        throw new Error("Remote Routes must expose a default React component")
      }
      // Legacy v1 remotes did not publish metadata. Retain rolling-release compatibility.
      if (component.federation && component.federation.version !== ROUTES_CONTRACT_VERSION) {
        throw new Error(`Incompatible remote contract ${component.federation.version}; expected ${ROUTES_CONTRACT_VERSION}`)
      }
      preloadRemote = module.preload ?? component.preload
      return { default: component }
    }).catch((error) => {
      modulePromise = null
      throw error
    })
    return modulePromise
  }
  const Remote = lazyWithPreload(loadModule)
  Remote.preload = async (pathname?: string) => {
    const module = await loadModule()
    markRoutePhase("remote-ready", pathname, module.default.federation?.buildId)
    await preloadRemote?.(pathname)
  }
  return Remote
}
