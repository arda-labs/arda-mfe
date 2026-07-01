import { lazy, Suspense, useEffect, useState } from "react"
import { AuthGuard, CallbackPage, ConsentPage, LoginPage } from "@workspace/auth"
import { ShellLayout } from "./ShellLayout"

const IamRoutes = lazy(() => import("iam/Routes"))
const PlatformRoutes = lazy(() => import("platform/Routes"))
const FinanceRoutes = lazy(() => import("finance/Routes"))
const AccountRoutes = lazy(() => import("account/Routes"))

function navigate(pathname: string) {
  window.history.pushState({}, "", pathname)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

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
  if (pathname === "/login") return <LoginPage />
  if (pathname === "/callback" || pathname === "/login-callback") return <CallbackPage />
  if (pathname === "/consent") return <ConsentPage />

  const isIam =
    pathname === "/iam" ||
    pathname.startsWith("/admin/users") ||
    pathname.startsWith("/admin/roles") ||
    pathname.startsWith("/admin/permissions") ||
    pathname.startsWith("/admin/audit")
  const isPlatform =
    pathname.startsWith("/admin/organizations") ||
    pathname.startsWith("/admin/parameters") ||
    pathname.startsWith("/admin/provinces") ||
    pathname.startsWith("/admin/wards") ||
    pathname.startsWith("/admin/lookups") ||
    pathname.startsWith("/admin/area-types") ||
    pathname.startsWith("/admin/areas") ||
    pathname.startsWith("/admin/credit-institutions") ||
    pathname.startsWith("/admin/templates") ||
    pathname.startsWith("/admin/calendar") ||
    pathname.startsWith("/admin/cutoff")
  const isFinance = pathname.startsWith("/finance/")
  const isAccount =
    pathname === "/my-account" ||
    pathname.startsWith("/my-account/") ||
    pathname.startsWith("/settings/") ||
    pathname.startsWith("/in/")

  return (
    <AuthGuard>
      <ShellLayout pathname={pathname} navigate={navigate}>
        {isIam ? (
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading IAM...</div>}>
            <IamRoutes />
          </Suspense>
        ) : isPlatform ? (
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading Platform...</div>}>
            <PlatformRoutes />
          </Suspense>
        ) : isFinance ? (
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading Finance...</div>}>
            <FinanceRoutes />
          </Suspense>
        ) : isAccount ? (
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading Account...</div>}>
            <AccountRoutes />
          </Suspense>
        ) : (
          <Dashboard />
        )}
      </ShellLayout>
    </AuthGuard>
  )
}

function Dashboard() {
  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <p className="text-sm text-muted-foreground">Shell</p>
      <h1 className="text-3xl font-semibold tracking-tight">Arda workspace</h1>
      <p className="text-muted-foreground">
        Auth, layout, i18n, theme, and notifications now live in the shell. Domain
        pages load as runtime micro frontends.
      </p>
    </section>
  )
}
