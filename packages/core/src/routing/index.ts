import { useEffect, useState } from "react"

/** Sync pathname with browser history (popstate + initial). */
export function usePathname(fallback = "/"): string {
  const [pathname, setPathname] = useState(() =>
    typeof window === "undefined" ? fallback : window.location.pathname
  )

  useEffect(() => {
    const sync = () => setPathname(window.location.pathname)
    window.addEventListener("popstate", sync)
    return () => window.removeEventListener("popstate", sync)
  }, [])

  return pathname
}

/** Imperative navigation compatible with shell App. */
export function navigateTo(path: string) {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
}
