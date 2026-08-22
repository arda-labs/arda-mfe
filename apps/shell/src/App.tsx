import { Suspense, useEffect, useRef, useState, type ReactNode } from "react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import {
  AuthLoadingScreen,
  AuthShellLoadingScreen,
} from "@workspace/auth/loading-screen"
import {
  CallbackPage,
  ConsentPage,
  LoginPage,
} from "@workspace/auth/pages"
import { redirectToHydraLogin } from "@workspace/auth/oauth"
import {
  normalizeAuthUser,
  useAuthStore,
} from "@workspace/auth/store"
import * as authShare from "@workspace/auth"
import { getMediaContentUrl } from "@workspace/media/urls"
import { apiUrl } from "@workspace/api/url"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Dashboard } from "./dashboard"
import { BadGatewayPage, NotFoundPage } from "./features/errors/page"
import {
  AccountRoutes,
  CrmRoutes,
  FinanceRoutes,
  HrmRoutes,
  IamRoutes,
  PlatformRoutes,
  WorkflowRoutes,
} from "./remote-routes"
import { ShellLayout } from "./ShellLayout"

const routeFallback = (
  <div
    aria-busy="true"
    aria-label="Đang tải ứng dụng"
    className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-6"
  >
    <span className="sr-only" role="status" aria-live="polite">
      Đang tải ứng dụng...
    </span>
    <div className="flex items-center justify-between gap-4">
      <Skeleton className="h-7 w-48 motion-reduce:animate-none" />
      <Skeleton className="h-9 w-28 motion-reduce:animate-none" />
    </div>
    <Skeleton className="h-10 w-full motion-reduce:animate-none" />
    <div className="min-h-0 flex-1 space-y-3 rounded-lg border bg-card p-4">
      <Skeleton className="h-10 w-full motion-reduce:animate-none" />
      <Skeleton className="h-10 w-full motion-reduce:animate-none" />
      <Skeleton className="h-10 w-full motion-reduce:animate-none" />
      <Skeleton className="h-10 w-10/12 motion-reduce:animate-none" />
    </div>
  </div>
)

function RemoteRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={routeFallback}>{children}</Suspense>
}

export function App() {
  const { pathname } = useLocation()
  const { isAuthenticated, login, clearSession } = useAuthStore()
  const isAuthRoute = [
    "/login",
    "/auth",
    "/callback",
    "/login-callback",
    "/consent",
  ].includes(pathname)
  const [authHydrated, setAuthHydrated] = useState(() =>
    useAuthStore.persist.hasHydrated()
  )
  const [sessionStatus, setSessionStatus] = useState<
    "checking" | "authenticated" | "redirecting"
  >("checking")
  const sessionCheckInFlight = useRef(false)

  useEffect(() => {
    if (authHydrated) return
    return useAuthStore.persist.onFinishHydration(() => setAuthHydrated(true))
  }, [authHydrated])

  useEffect(() => {
    if (
      isAuthRoute ||
      !authHydrated ||
      sessionCheckInFlight.current ||
      sessionStatus === "redirecting" ||
      (sessionStatus === "authenticated" && isAuthenticated)
    ) {
      return
    }

    let cancelled = false
    sessionCheckInFlight.current = true

    fetch(apiUrl("/api/auth/me"), { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json()
        throw new Error("session expired")
      })
      .then((userData) => {
        if (cancelled) return
        login(normalizeAuthUser(userData, getMediaContentUrl))
        setSessionStatus("authenticated")
      })
      .catch(() => {
        if (cancelled) return
        clearSession()
        setSessionStatus("redirecting")
        void redirectToHydraLogin(
          `${window.location.pathname}${window.location.search}`
        )
      })

    return () => {
      cancelled = true
      sessionCheckInFlight.current = false
    }
  }, [
    authHydrated,
    clearSession,
    isAuthRoute,
    isAuthenticated,
    login,
    sessionStatus,
  ])

  if (!isAuthRoute && (sessionStatus !== "authenticated" || !isAuthenticated)) {
    return <AuthShellLoadingScreen />
  }

  return (
    <Routes>
      <Route path="/auth" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route path="/login-callback" element={<CallbackPage />} />
      <Route path="/consent" element={<ConsentPage />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="/502" element={<BadGatewayPage />} />
      <Route
        element={
          <Suspense fallback={<AuthLoadingScreen />}>
            <authShare.StepUpProvider>
              <authShare.AuthGuard>
                <ShellLayout />
              </authShare.AuthGuard>
            </authShare.StepUpProvider>
          </Suspense>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
        <Route
          path="/admin/organizations/*"
          element={
            <RemoteRoute>
              <PlatformRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/admin/parameters/*"
          element={
            <RemoteRoute>
              <PlatformRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/admin/provinces/*"
          element={
            <RemoteRoute>
              <PlatformRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/admin/wards/*"
          element={
            <RemoteRoute>
              <PlatformRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/admin/lookups/*"
          element={
            <RemoteRoute>
              <PlatformRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/admin/area-types/*"
          element={
            <RemoteRoute>
              <PlatformRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/admin/areas/*"
          element={
            <RemoteRoute>
              <PlatformRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/admin/credit-institutions/*"
          element={
            <RemoteRoute>
              <PlatformRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/admin/templates/*"
          element={
            <RemoteRoute>
              <PlatformRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/admin/calendar/*"
          element={
            <RemoteRoute>
              <PlatformRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/admin/cutoff/*"
          element={
            <RemoteRoute>
              <PlatformRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/admin/users/*"
          element={
            <RemoteRoute>
              <IamRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/admin/groups/*"
          element={
            <RemoteRoute>
              <IamRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/admin/roles/*"
          element={
            <RemoteRoute>
              <IamRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/admin/permissions/*"
          element={
            <RemoteRoute>
              <IamRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/admin/audit/*"
          element={
            <RemoteRoute>
              <IamRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/admin/settings/*"
          element={
            <RemoteRoute>
              <IamRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/finance/*"
          element={
            <RemoteRoute>
              <FinanceRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/hrm/*"
          element={
            <RemoteRoute>
              <HrmRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/customers/*"
          element={
            <RemoteRoute>
              <CrmRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/workflow/*"
          element={
            <RemoteRoute>
              <WorkflowRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/workbench/*"
          element={
            <RemoteRoute>
              <WorkflowRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/my-account/*"
          element={
            <RemoteRoute>
              <AccountRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/in/*"
          element={
            <RemoteRoute>
              <AccountRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/settings/*"
          element={
            <RemoteRoute>
              <AccountRoutes />
            </RemoteRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
