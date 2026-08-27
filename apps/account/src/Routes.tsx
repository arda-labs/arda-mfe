import "@workspace/i18n/apps/account"
import { useLocation, useNavigate } from "react-router-dom"
import { QueryProvider } from "@workspace/query/provider"
import { attachPreload, lazyWithPreload } from "@workspace/ui/lib/lazy"

const AppearancePage = lazyWithPreload(() =>
  import("@/features/settings/appearance/page").then((m) => ({
    default: m.AppearancePage,
  }))
)
const DevicesPage = lazyWithPreload(() =>
  import("@/features/settings/devices/page").then((m) => ({
    default: m.DevicesPage,
  }))
)
const SettingsLayout = lazyWithPreload(() =>
  import("@/features/settings/layout").then((m) => ({
    default: m.SettingsLayout,
  }))
)
const AccountProfilePage = lazyWithPreload(() =>
  import("@/features/settings/profile/page").then((m) => ({
    default: m.ProfilePage,
  }))
)
const SecurityPage = lazyWithPreload(() =>
  import("@/features/settings/security/page").then((m) => ({
    default: m.SecurityPage,
  }))
)
const SessionsPage = lazyWithPreload(() =>
  import("@/features/settings/sessions/page").then((m) => ({
    default: m.SessionsPage,
  }))
)
const PublicProfilePage = lazyWithPreload(() =>
  import("@/features/profile/page").then((m) => ({
    default: m.ProfilePage,
  }))
)

function resolvePathname(pathname?: string) {
  if (pathname) return pathname
  if (typeof window === "undefined") return "/my-account/profile"
  return window.location.pathname
}

function resolvePage(pathname: string) {
  if (pathname.startsWith("/in/")) return PublicProfilePage
  if (pathname.startsWith("/settings/appearance")) return AppearancePage
  if (pathname.startsWith("/my-account/security")) return SecurityPage
  if (pathname.startsWith("/my-account/sessions")) return SessionsPage
  if (pathname.startsWith("/my-account/devices")) return DevicesPage
  return AccountProfilePage
}

async function preload(pathname?: string) {
  const page = resolvePage(resolvePathname(pathname))
  if (page === PublicProfilePage || page === AppearancePage) {
    await page.preload()
    return
  }
  await Promise.all([SettingsLayout.preload(), page.preload()])
}

function RemoteRoutes() {
  const location = useLocation()
  const navigate = useNavigate()
  const { pathname } = location

  if (pathname.startsWith("/in/")) return <PublicProfilePage />
  if (pathname.startsWith("/settings/appearance")) return <AppearancePage />

  let page = <AccountProfilePage />
  if (pathname.startsWith("/my-account/security")) page = <SecurityPage />
  if (pathname.startsWith("/my-account/sessions")) page = <SessionsPage />
  if (pathname.startsWith("/my-account/devices")) page = <DevicesPage />

  return (
    <SettingsLayout pathname={pathname} navigate={navigate}>
      {page}
    </SettingsLayout>
  )
}

const RemoteRoutesWithPreload = attachPreload(RemoteRoutes, preload)

/**
 * Every remote mounts the shared TanStack Query client at its route root so
 * server-list pages can adopt @workspace/admin-list without per-page wiring.
 */
const RemoteRoutesWithProviders = Object.assign(
  function ProvidedRoutes() {
    return (
      <QueryProvider>
        <RemoteRoutesWithPreload />
      </QueryProvider>
    )
  },
  { preload: RemoteRoutesWithPreload.preload }
)

export default RemoteRoutesWithProviders
