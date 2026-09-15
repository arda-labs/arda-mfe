import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { AuthLoadingScreen, AuthShellLoadingScreen } from "@workspace/auth/loading-screen"
import { redirectToHydraLogin } from "@workspace/auth/oauth"
import { normalizeAuthUser, useAuthStore } from "@workspace/auth/store"
import * as authShare from "@workspace/auth"
import { getMediaContentUrl } from "@workspace/media/urls"
import { api, type ApiSuccess } from "@workspace/api"
import { lazyWithPreload } from "@workspace/ui/lib/lazy"
import { Dashboard } from "./dashboard"
import { BadGatewayPage, NotFoundPage } from "./features/errors/page"
import { ShellLayout } from "./ShellLayout"
import { RemoteRoute } from "./components/RemoteRoute"
import { remoteRouteEntries } from "./remote-routes"
import { installNavigationPreload, preloadNavigation } from "./navigation-preload"

const LoginPage = lazyWithPreload(() => import("@workspace/auth/pages").then((m) => ({ default: m.LoginPage })))
const RecoveryPage = lazyWithPreload(() => import("@workspace/auth/pages").then((m) => ({ default: m.RecoveryPage })))
const CallbackPage = lazyWithPreload(() => import("@workspace/auth/pages").then((m) => ({ default: m.CallbackPage })))
const ConsentPage = lazyWithPreload(() => import("@workspace/auth/pages").then((m) => ({ default: m.ConsentPage })))
const OlorinPage = lazyWithPreload(() => import("./features/ai/olorin-page").then((m) => ({ default: m.OlorinPage })))
const aiAssistantEnabled = import.meta.env.VITE_AI_ENABLED !== "false"

export function App() {
  const { pathname } = useLocation()
  const { isAuthenticated, login, clearSession } = useAuthStore()
  const isAuthRoute = ["/login", "/auth", "/recovery", "/callback", "/login-callback", "/consent"].includes(pathname)
  const [authHydrated, setAuthHydrated] = useState(() => useAuthStore.persist.hasHydrated())
  const [sessionStatus, setSessionStatus] = useState<"checking" | "authenticated" | "redirecting">("checking")
  const sessionCheckInFlight = useRef(false)

  useEffect(installNavigationPreload, [])
  // Speculative code loading only after the session is confirmed, so a logged-out
  // deep link never downloads remote JavaScript before the login redirect.
  useLayoutEffect(() => {
    if (isAuthRoute || sessionStatus !== "authenticated" || !isAuthenticated) return
    void preloadNavigation(pathname)
  }, [isAuthenticated, isAuthRoute, pathname, sessionStatus])
  useEffect(() => {
    if (authHydrated) return
    return useAuthStore.persist.onFinishHydration(() => setAuthHydrated(true))
  }, [authHydrated])
  useEffect(() => {
    if (isAuthRoute || !authHydrated || sessionCheckInFlight.current || sessionStatus === "redirecting" || (sessionStatus === "authenticated" && isAuthenticated)) return
    let cancelled = false
    sessionCheckInFlight.current = true
    api.get<ApiSuccess<Parameters<typeof normalizeAuthUser>[0]>>("/api/auth/me")
      .then(({ result: userData }) => {
        if (cancelled) return
        login(normalizeAuthUser(userData, getMediaContentUrl))
        setSessionStatus("authenticated")
      })
      .catch(() => {
        if (cancelled) return
        clearSession()
        setSessionStatus("redirecting")
        void redirectToHydraLogin(`${window.location.pathname}${window.location.search}`)
      })
    return () => { cancelled = true; sessionCheckInFlight.current = false }
  }, [authHydrated, clearSession, isAuthRoute, isAuthenticated, login, sessionStatus])

  if (!isAuthRoute && (sessionStatus !== "authenticated" || !isAuthenticated)) return <AuthShellLoadingScreen />
  return (
    <Suspense fallback={<AuthLoadingScreen />}>
      <Routes>
        <Route path="/auth" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recovery" element={<RecoveryPage />} />
        <Route path="/callback" element={<CallbackPage />} />
        <Route path="/login-callback" element={<CallbackPage />} />
        <Route path="/consent" element={<ConsentPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="/502" element={<BadGatewayPage />} />
        <Route element={<authShare.StepUpProvider><authShare.AuthGuard><ShellLayout /></authShare.AuthGuard></authShare.StepUpProvider>}>
          <Route index element={<Dashboard />} />
          <Route path="/ai" element={aiAssistantEnabled ? <RemoteRoute><OlorinPage /></RemoteRoute> : <NotFoundPage />} />
          <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
          {remoteRouteEntries.map(({ path, component: Remote }) => (
            <Route key={path} path={path} element={<RemoteRoute><Remote /></RemoteRoute>} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
