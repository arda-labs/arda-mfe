import {
  createElement,
  lazy,
  Suspense,
  useEffect,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react"
import { useLocation } from "react-router-dom"
import { RouteLoading } from "../components/route-loading"
import { markRoutePhase } from "./route-performance"
import { routesContract } from "./federation-contract"
import { useI18n, type AppLocaleLoader } from "@workspace/i18n"

const retryKey = Symbol.for("arda.lazy-retries.v1")
const retryRoot = globalThis as typeof globalThis & { [retryKey]?: Set<() => void> }
const retries = (retryRoot[retryKey] ??= new Set<() => void>())

export function retryFailedLazyLoads() {
  for (const retry of [...retries]) retry()
}

export function matchesRoutePrefix(pathname: string, prefix: string) {
  if (prefix.endsWith("/")) return pathname.startsWith(prefix) && pathname.length > prefix.length
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PreloadableComponent<T extends ComponentType<any> = ComponentType<any>> = T & {
  preload: (pathname?: string) => Promise<void>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PreloadableRemoteComponent<T extends ComponentType<any> = ComponentType<any>> = T & {
  preload: (pathname?: string) => Promise<void>
  federation: typeof routesContract
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithPreload<T extends ComponentType<any>>(
  load: () => Promise<{ default: T }>
): PreloadableComponent<T> {
  let modulePromise: Promise<{ default: T }> | null = null
  let revision = 0
  const listeners = new Set<() => void>()
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }

  const loadModule = () => {
    if (!modulePromise) {
      modulePromise = load().then((module) => {
        retries.delete(reset)
        return module
      }).catch((error) => {
        modulePromise = null
        retries.add(reset)
        throw error
      })
    }
    return modulePromise
  }

  let Lazy = lazy(loadModule)
  function reset() {
    retries.delete(reset)
    modulePromise = null
    Lazy = lazy(loadModule)
    revision += 1
    listeners.forEach((listener) => listener())
  }
  const component = function RetryableLazy(props: React.ComponentProps<T>) {
    useSyncExternalStore(subscribe, () => revision, () => revision)
    return createElement(Lazy, props)
  } as unknown as PreloadableComponent<T>
  component.preload = async (pathname) => {
    const module = await loadModule()
    await (module.default as T & { preload?: (pathname?: string) => Promise<void> }).preload?.(pathname)
  }
  return component
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function attachPreload<T extends ComponentType<any>>(
  component: T,
  preload: (pathname?: string) => Promise<void>
): PreloadableRemoteComponent<T> {
  return Object.assign(component, { preload, federation: routesContract })
}

export type RouteMapEntry = {
  prefix: string
  exact?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: PreloadableComponent<ComponentType<any>>
}

export type CreateRemoteRoutesOptions = {
  routes: RouteMapEntry[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultComponent: PreloadableComponent<ComponentType<any>>
  defaultPrefixes?: string[]
  wrapper?: ComponentType<{ children: ReactNode }>
  locales?: AppLocaleLoader
  deferReady?: boolean
}

/**
 * Creates a micro-frontend remote entry router component with automatic
 * path-based component selection and preloading support.
 */
export function createRemoteRoutes({
  routes,
  defaultComponent,
  defaultPrefixes,
  wrapper: Wrapper,
  locales,
  deferReady = false,
}: CreateRemoteRoutesOptions): PreloadableRemoteComponent<ComponentType<Record<string, unknown>>> {
  function resolve(pathname: string) {
    const match = [...routes].sort((a, b) => b.prefix.length - a.prefix.length)
      .find((r) => r.exact ? pathname === r.prefix : matchesRoutePrefix(pathname, r.prefix))
    const fallbackAllowed = !defaultPrefixes || defaultPrefixes.some((prefix) => matchesRoutePrefix(pathname, prefix))
    return match?.component ?? (fallbackAllowed ? defaultComponent : null)
  }
  async function preload(pathname = "") {
    await Promise.all([locales?.preload(), resolve(pathname)?.preload(pathname)])
  }

  function RemoteRoutes() {
    const { pathname } = useLocation()
    const { locale } = useI18n()
    locales?.read(locale)
    const PageComponent = resolve(pathname)

    const inner = createElement(
      "div",
      { className: "flex h-full min-h-0 flex-col" },
      createElement(
        Suspense,
        { fallback: createElement(RouteLoading) },
        PageComponent ? createElement(PageComponent, { pathname }) : createElement("p", { role: "status", className: "p-6" }, "404"),
        deferReady ? null : createElement(RouteReady, { pathname })
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

export function RouteReady({ pathname }: { pathname: string }) {
  useEffect(() => { markRoutePhase("page-ready", pathname) }, [pathname])
  return null
}
