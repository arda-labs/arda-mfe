import {
  createElement,
  lazy,
  Suspense,
  type ComponentType,
  type ReactNode,
} from "react"
import { useLocation } from "react-router-dom"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PreloadableComponent<T extends ComponentType<any> = ComponentType<any>> = T & {
  preload: () => Promise<void>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PreloadableRemoteComponent<T extends ComponentType<any> = ComponentType<any>> = T & {
  preload: (pathname?: string) => Promise<void>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithPreload<T extends ComponentType<any>>(
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function attachPreload<T extends ComponentType<any>>(
  component: T,
  preload: (pathname?: string) => Promise<void>
): PreloadableRemoteComponent<T> {
  return Object.assign(component, { preload })
}

export type RouteMapEntry = {
  prefix: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: PreloadableComponent<ComponentType<any>>
}

export type CreateRemoteRoutesOptions = {
  routes: RouteMapEntry[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultComponent: PreloadableComponent<ComponentType<any>>
  wrapper?: ComponentType<{ children: ReactNode }>
}

/**
 * Creates a micro-frontend remote entry router component with automatic
 * path-based component selection and preloading support.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createRemoteRoutes({
  routes,
  defaultComponent,
  wrapper: Wrapper,
}: CreateRemoteRoutesOptions): PreloadableRemoteComponent<ComponentType<any>> {
  async function preload(pathname = "") {
    const match = routes.find((r) => pathname.startsWith(r.prefix))
    const target = match?.component ?? defaultComponent
    await target.preload()
  }

  function RemoteRoutes() {
    const { pathname } = useLocation()
    const match = routes.find((r) => pathname.startsWith(r.prefix))
    const PageComponent = match?.component ?? defaultComponent

    const inner = createElement(
      "div",
      { className: "flex h-full min-h-0 flex-col" },
      createElement(
        Suspense,
        { fallback: null },
        createElement(PageComponent)
      )
    )

    if (Wrapper) {
      return createElement(Wrapper, null, inner)
    }

    return inner
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return attachPreload(RemoteRoutes as ComponentType<any>, preload)
}
