import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from "react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { AlertCircle, RefreshCw } from "lucide-react"
import {
  AuthLoadingScreen,
  AuthShellLoadingScreen,
} from "@workspace/auth/loading-screen"
import { CallbackPage, ConsentPage, LoginPage } from "@workspace/auth/pages"
import { redirectToHydraLogin } from "@workspace/auth/oauth"
import { normalizeAuthUser, useAuthStore } from "@workspace/auth/store"
import * as authShare from "@workspace/auth"
import { getMediaContentUrl } from "@workspace/media/urls"
import { api, type ApiSuccess } from "@workspace/api"
import { Button } from "@workspace/ui/components/button"
import { reportBrowserError } from "@workspace/ui/observability/browser-telemetry"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Dashboard } from "./dashboard"
import { BadGatewayPage, NotFoundPage } from "./features/errors/page"
import {
  AccountRoutes,
  AiRoutes,
  CrmRoutes,
  FinanceRoutes,
  HrmRoutes,
  IamRoutes,
  PlatformRoutes,
  WorkflowRoutes,
} from "./remote-routes"
import { ShellLayout } from "./ShellLayout"
import { OlorinPage } from "./features/ai/olorin-page"

const aiProtocolSpikeEnabled = import.meta.env.VITE_AI_PROTOCOL_SPIKE !== "false"
const aiAssistantEnabled = import.meta.env.VITE_AI_ENABLED !== "false"

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

class RemoteErrorBoundary extends Component<
  { children: ReactNode; resetKey?: string },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportBrowserError({
      kind: "remote-module",
      error: `${error.message}\n${info.componentStack ?? ""}`,
      route: window.location.pathname,
    })
  }

  componentDidUpdate(prevProps: { resetKey?: string }) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Không thể tải phân hệ</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Đã xảy ra lỗi khi tải module từ máy chủ. Vui lòng kiểm tra kết nối mạng hoặc thử lại.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              <RefreshCw className="mr-1.5 size-3.5" />
              Thử lại
            </Button>
            <Button
              size="sm"
              onClick={() => window.location.reload()}
            >
              Tải lại trang
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function RemoteRoute({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <RemoteErrorBoundary resetKey={pathname}>
      <Suspense fallback={routeFallback}>{children}</Suspense>
    </RemoteErrorBoundary>
  )
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

    api
      .get<ApiSuccess<Parameters<typeof normalizeAuthUser>[0]>>("/api/auth/me")
      .then(({ result: userData }) => {
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
        path="/ai-protocol-spike"
        element={
          aiProtocolSpikeEnabled || aiAssistantEnabled ? (
            <OlorinPage />
          ) : (
            <NotFoundPage />
          )
        }
      />
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
        <Route
          path="/ai"
          element={aiAssistantEnabled ? <OlorinPage /> : <NotFoundPage />}
        />
        <Route
          path="/ai/knowledge/*"
          element={
            <RemoteRoute>
              <AiRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/ai/settings/*"
          element={
            <RemoteRoute>
              <AiRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/ai/approvals/*"
          element={
            <RemoteRoute>
              <AiRoutes />
            </RemoteRoute>
          }
        />
        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
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
          path="/admin/tenants/*"
          element={
            <RemoteRoute>
              <IamRoutes />
            </RemoteRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <RemoteRoute>
              <PlatformRoutes />
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
