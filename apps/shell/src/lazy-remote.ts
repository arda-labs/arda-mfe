import { lazy, type ComponentType, type LazyExoticComponent } from "react"

type RemoteModule = {
  default?: ComponentType
  [key: string]: unknown
}

export type PreloadableRemote = LazyExoticComponent<ComponentType> & {
  preload: () => Promise<void>
}

export function lazyRemote(load: () => Promise<RemoteModule>) {
  let modulePromise: Promise<{ default: ComponentType }> | null = null
  const loadModule = () => {
    if (!modulePromise) {
      modulePromise = load()
        .then((mod) => {
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
  Remote.preload = async () => {
    await loadModule()
  }
  return Remote
}
