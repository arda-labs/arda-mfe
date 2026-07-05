import { AppearancePage } from "@/features/settings/appearance/page"
import { DevicesPage } from "@/features/settings/devices/page"
import { SettingsLayout } from "@/features/settings/layout"
import { ProfilePage as AccountProfilePage } from "@/features/settings/profile/page"
import { SecurityPage } from "@/features/settings/security/page"
import { SessionsPage } from "@/features/settings/sessions/page"
import { ProfilePage as PublicProfilePage } from "@/features/profile/page"
import { navigateTo, usePathname } from "@workspace/core/routing"

export default function Routes() {
  return <AccountRoutes />
}

function AccountRoutes() {
  const pathname = usePathname("/my-account/profile")

  if (pathname.startsWith("/in/")) return <PublicProfilePage />
  if (pathname.startsWith("/settings/appearance")) return <AppearancePage />

  let page = <AccountProfilePage />
  if (pathname.startsWith("/my-account/security")) page = <SecurityPage />
  if (pathname.startsWith("/my-account/sessions")) page = <SessionsPage />
  if (pathname.startsWith("/my-account/devices")) page = <DevicesPage />

  return (
    <SettingsLayout pathname={pathname} navigate={navigateTo}>
      {page}
    </SettingsLayout>
  )
}
