import { useEffect, useState } from "react"
import { AppearancePage } from "@/features/settings/appearance/page"
import { DevicesPage } from "@/features/settings/devices/page"
import { SettingsLayout } from "@/features/settings/layout"
import { ProfilePage as AccountProfilePage } from "@/features/settings/profile/page"
import { SecurityPage } from "@/features/settings/security/page"
import { SessionsPage } from "@/features/settings/sessions/page"
import { ProfilePage as PublicProfilePage } from "@/features/profile/page"

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

export default function Routes() {
  return <AccountRoutes />
}

function AccountRoutes() {
  const pathname = usePathname()

  if (pathname.startsWith("/in/")) return <PublicProfilePage />

  let page = <AccountProfilePage />
  if (pathname.startsWith("/my-account/security")) page = <SecurityPage />
  if (pathname.startsWith("/my-account/sessions")) page = <SessionsPage />
  if (pathname.startsWith("/my-account/devices")) page = <DevicesPage />
  if (pathname.startsWith("/settings/appearance")) page = <AppearancePage />

  return (
    <SettingsLayout pathname={pathname} navigate={navigate}>
      {page}
    </SettingsLayout>
  )
}
