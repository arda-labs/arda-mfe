import { Suspense } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { createAppLocaleLoader, useI18n } from "@workspace/i18n"
import { QueryProvider } from "@workspace/query/provider"
import { attachPreload, lazyWithPreload, matchesRoutePrefix, RouteReady } from "@workspace/ui/lib/lazy"
import { RouteLoading } from "@workspace/ui/components/route-loading"

const locales = createAppLocaleLoader("profile", {
  "vi-VN": () => import("../locales/vi-VN.json"),
  "en-US": () => import("../locales/en-US.json"),
})
const AppearancePage = lazyWithPreload(() => import("@/features/settings/appearance/page").then((m) => ({ default: m.AppearancePage })))
const DevicesPage = lazyWithPreload(() => import("@/features/settings/devices/page").then((m) => ({ default: m.DevicesPage })))
const SettingsLayout = lazyWithPreload(() => import("@/features/settings/layout").then((m) => ({ default: m.SettingsLayout })))
const AccountProfilePage = lazyWithPreload(() => import("@/features/settings/profile/page").then((m) => ({ default: m.ProfilePage })))
const SecurityPage = lazyWithPreload(() => import("@/features/settings/security/page").then((m) => ({ default: m.SecurityPage })))
const SessionsPage = lazyWithPreload(() => import("@/features/settings/sessions/page").then((m) => ({ default: m.SessionsPage })))
const PublicProfilePage = lazyWithPreload(() => import("@/features/profile/page").then((m) => ({ default: m.ProfilePage })))
const profileRoute = { prefix: "/my-account/profile", component: AccountProfilePage, layout: true }
const routes = [
  { prefix: "/in/", component: PublicProfilePage, layout: false },
  { prefix: "/settings/appearance", component: AppearancePage, layout: false },
  { prefix: "/my-account/security", component: SecurityPage, layout: true },
  { prefix: "/my-account/sessions", component: SessionsPage, layout: true },
  { prefix: "/my-account/devices", component: DevicesPage, layout: true },
  profileRoute,
]
// Legacy fallback: unmatched sub-paths of the account surface used to render
// the profile tab, so bare /settings and /my-account must keep resolving.
const accountFallback = /^\/(?:my-account|settings|in)(?:\/|$)/
function resolve(pathname: string) {
  return (
    routes.find((route) => matchesRoutePrefix(pathname, route.prefix)) ??
    (accountFallback.test(pathname) ? profileRoute : undefined)
  )
}
async function preload(pathname = "/my-account/profile") {
  const route = resolve(pathname)
  await Promise.all([locales.preload(), route?.component.preload(), route?.layout ? SettingsLayout.preload() : undefined])
}
function RemoteRoutes() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { locale } = useI18n()
  locales.read(locale)
  const route = resolve(pathname)
  if (!route) return <p className="p-6" role="status">404</p>
  const Page = route.component
  return <QueryProvider><Suspense fallback={<RouteLoading />}>
    {route.layout ? <SettingsLayout pathname={pathname} navigate={navigate}><Page /></SettingsLayout> : <Page />}
    <RouteReady pathname={pathname} />
  </Suspense></QueryProvider>
}
export default attachPreload(RemoteRoutes, preload)
