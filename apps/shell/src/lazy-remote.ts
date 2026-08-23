import { lazy, type ComponentType, type LazyExoticComponent } from "react"

type RemoteModule = {
  default?: PreloadableRemoteComponent
  preload?: (pathname?: string) => Promise<void>
  [key: string]: unknown
}

type PreloadableRemoteComponent = ComponentType & {
  preload?: (pathname?: string) => Promise<void>
}

export type PreloadableRemote = LazyExoticComponent<ComponentType> & {
  preload: (pathname?: string) => Promise<void>
}

export function lazyRemote(load: () => Promise<RemoteModule>) {
  let modulePromise: Promise<{ default: ComponentType }> | null = null
  let preloadRemote: RemoteModule["preload"]
  const loadModule = () => {
    if (!modulePromise) {
      modulePromise = load()
        .then((mod) => {
          preloadRemote = mod.preload ?? mod.default?.preload
          const component =
            mod.default ??
            Object.values(mod).find((value) => typeof value === "function")
          if (!component) {
            throw new Error("Remote module did not expose a React component")
          }
          return { default: component as ComponentType }
        })
        .catch((error) => {
          modulePromise = null
          throw error
        })
    }
    return modulePromise
  }

  const Remote = lazy(loadModule) as PreloadableRemote
  Remote.preload = async (pathname) => {
    await loadModule()
    await preloadRemote?.(pathname)
  }
  return Remote
}
