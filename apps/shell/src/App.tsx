import { lazy, Suspense, useEffect, useState } from "react"
import { AuthLoadingScreen } from "../../../packages/auth/src/loading-screen"
import {
  CallbackPage,
  ConsentPage,
  LoginPage,
} from "../../../packages/auth/src/pages"
import { redirectToHydraLogin } from "../../../packages/auth/src/oauth"
import {
  normalizeAuthUser,
  useAuthStore,
} from "../../../packages/auth/src/store"
import { getMediaContentUrl } from "../../../packages/core/src/media/urls"

const WorkspaceApp = lazy(() => import("./WorkspaceApp"))

function usePathname() {
  const [pathname, setPathname] = useState(window.location.pathname)

  useEffect(() => {
    const syncPathname = () => setPathname(window.location.pathname)
    window.addEventListener("popstate", syncPathname)
    return () => window.removeEventListener("popstate", syncPathname)
  }, [])

  return pathname
}

export function App() {
  const pathname = usePathname()
  const { isAuthenticated, login, logout } = useAuthStore()
  const isAuthRoute = [
    "/login",
    "/auth",
    "/callback",
    "/login-callback",
    "/consent",
  ].includes(pathname)
  const shouldCheckSession = !isAuthRoute && !isAuthenticated
  const [redirectingToAuth, setRedirectingToAuth] = useState(false)

  useEffect(() => {
    if (!shouldCheckSession || redirectingToAuth) return
    let cancelled = false
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json()
        throw new Error("session expired")
      })
      .then((userData) => {
        if (!cancelled) login(normalizeAuthUser(userData, getMediaContentUrl))
      })
      .catch(() => {
        if (cancelled) return
        logout()
        setRedirectingToAuth(true)
        void redirectToHydraLogin(
          `${window.location.pathname}${window.location.search}`
        )
      })
    return () => {
      cancelled = true
    }
  }, [login, logout, redirectingToAuth, shouldCheckSession])

  if (shouldCheckSession || (redirectingToAuth && !isAuthRoute))
    return <AuthLoadingScreen />

  if (pathname === "/auth") return <LoginPage />
  if (pathname === "/login") return <LoginPage />
  if (pathname === "/callback" || pathname === "/login-callback")
    return <CallbackPage />
  if (pathname === "/consent") return <ConsentPage />

  return (
    <Suspense fallback={<AuthLoadingScreen />}>
      <WorkspaceApp pathname={pathname} />
    </Suspense>
  )
}
