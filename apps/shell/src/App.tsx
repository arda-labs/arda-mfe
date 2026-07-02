import { lazy, Suspense, useEffect, useRef, useState } from "react"
import { AuthLoadingScreen } from "../../../packages/auth/src/loading-screen"
import { CallbackPage, ConsentPage, LoginPage } from "../../../packages/auth/src/pages"
import { redirectToHydraLogin } from "../../../packages/auth/src/oauth"
import { normalizeAuthUser, useAuthStore } from "../../../packages/auth/src/store"
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
  const isAuthRoute = ["/login", "/auth", "/callback", "/login-callback", "/consent"].includes(pathname)
  const [checkingSession, setCheckingSession] = useState(!isAuthRoute && !isAuthenticated)
  const redirectingToAuth = useRef(false)

  useEffect(() => {
    if (isAuthRoute || isAuthenticated) {
      setCheckingSession(false)
      return
    }
    let cancelled = false
    setCheckingSession(true)
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
        redirectingToAuth.current = true
        void redirectToHydraLogin(`${window.location.pathname}${window.location.search}`)
      })
      .finally(() => {
        if (!cancelled && !redirectingToAuth.current) setCheckingSession(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthRoute, isAuthenticated, login, logout, pathname])

  if (checkingSession || redirectingToAuth.current) return <AuthLoadingScreen />

  if (pathname === "/auth") return <LoginPage />
  if (pathname === "/login") return <LoginPage />
  if (pathname === "/callback" || pathname === "/login-callback") return <CallbackPage />
  if (pathname === "/consent") return <ConsentPage />

  return (
    <Suspense fallback={<AuthLoadingScreen />}>
      <WorkspaceApp pathname={pathname} />
    </Suspense>
  )
}
