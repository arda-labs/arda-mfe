import {
  lazy,
  type ComponentType,
} from "react"

export type PreloadableComponent<T extends ComponentType<never>> =
  T & {
    preload: () => Promise<void>
  }

export type PreloadableRemoteComponent<T extends ComponentType<never>> = T & {
  preload: (pathname?: string) => Promise<void>
}

export function lazyWithPreload<T extends ComponentType<never>>(
  load: () => Promise<{ default: T }>
): PreloadableComponent<T> {
  let modulePromise: Promise<{ default: T }> | null = null

  const loadModule = () => {
    if (!modulePromise) {
      modulePromise = load().catch((error) => {
        modulePromise = null
        throw error
      })
    }
    return modulePromise
  }

  const component = lazy(
    loadModule as unknown as Parameters<typeof lazy>[0]
  ) as unknown as PreloadableComponent<T>
  component.preload = async () => {
    await loadModule()
  }
  return component
}

export function attachPreload<T extends ComponentType<never>>(
  component: T,
  preload: (pathname?: string) => Promise<void>
): PreloadableRemoteComponent<T> {
  return Object.assign(component, { preload })
}
