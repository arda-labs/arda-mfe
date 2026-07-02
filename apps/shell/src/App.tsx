import { lazy, Suspense, useEffect, useState } from "react"
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
        redirectToHydraLogin(`${window.location.pathname}${window.location.search}`)
      })
      .finally(() => {
        if (!cancelled) setCheckingSession(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthRoute, isAuthenticated, login, logout, pathname])

  if (checkingSession) return <WorkspaceLoading />

  if (pathname === "/auth") return <LoginPage />
  if (pathname === "/login") return <LoginPage />
  if (pathname === "/callback" || pathname === "/login-callback") return <CallbackPage />
  if (pathname === "/consent") return <ConsentPage />

  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <WorkspaceApp pathname={pathname} />
    </Suspense>
  )
}

function WorkspaceLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950 px-4 py-6 text-foreground transition-colors duration-500" style={{ minHeight: "100dvh" }}>
      <div className="flex flex-col items-center gap-6 py-6 text-center">
        <div className="relative flex size-16 items-center justify-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-lg shadow-primary/20 animate-pulse">
            A
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/10" />
          <div className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-primary animate-spin" />
        </div>
        
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight">Arda Secure Session</h1>
          <p className="text-xs leading-relaxed text-muted-foreground max-w-xs mx-auto">Loading secure workspace...</p>
        </div>
      </div>
    </main>
  )
}
