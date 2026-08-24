import {
  createElement,
  lazy,
  Suspense,
  type ComponentType,
  type ReactNode,
} from "react"
import { useLocation } from "react-router-dom"

export type PreloadableComponent<T extends ComponentType<Record<string, unknown>> = ComponentType<Record<string, unknown>>> = T & {
  preload: () => Promise<void>
}

export type PreloadableRemoteComponent<T extends ComponentType<Record<string, unknown>> = ComponentType<Record<string, unknown>>> = T & {
  preload: (pathname?: string) => Promise<void>
}

export function lazyWithPreload<T extends ComponentType<Record<string, unknown>>>(
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

export function attachPreload<T extends ComponentType<Record<string, unknown>>>(
  component: T,
  preload: (pathname?: string) => Promise<void>
): PreloadableRemoteComponent<T> {
  return Object.assign(component, { preload })
}

export type RouteMapEntry = {
  prefix: string
  component: PreloadableComponent<ComponentType<Record<string, unknown>>>
}

export type CreateRemoteRoutesOptions = {
  routes: RouteMapEntry[]
  defaultComponent: PreloadableComponent<ComponentType<Record<string, unknown>>>
  wrapper?: ComponentType<{ children: ReactNode }>
}

/**
 * Creates a micro-frontend remote entry router component with automatic
 * path-based component selection and preloading support.
 */
export function createRemoteRoutes({
  routes,
  defaultComponent,
  wrapper: Wrapper,
}: CreateRemoteRoutesOptions): PreloadableRemoteComponent<ComponentType<Record<string, unknown>>> {
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

  return attachPreload(RemoteRoutes as ComponentType<Record<string, unknown>>, preload)
}
