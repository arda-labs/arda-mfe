import { registerAppLocales } from "@workspace/i18n"
import enCrm from "../locales/en-US.json"
import viCrm from "../locales/vi-VN.json"

registerAppLocales("crm", {
  "vi-VN": viCrm,
  "en-US": enCrm,
})
import { Suspense } from "react"
import { useLocation } from "react-router-dom"
import { QueryProvider } from "@workspace/query/provider"
import { attachPreload, lazyWithPreload } from "@workspace/ui/lib/lazy"

const CustomersPage = lazyWithPreload(() =>
  import("@/features/customers/page").then((m) => ({
    default: m.CustomersPage,
  }))
)
const ReportsPage = lazyWithPreload(() =>
  import("@/features/reports/page").then((m) => ({
    default: m.ReportsPage,
  }))
)
const ProjectsPage = lazyWithPreload(() =>
  import("@/features/projects/page").then((m) => ({
    default: m.ProjectsPage,
  }))
)

async function preload(pathname = "") {
  if (pathname.startsWith("/customers/reports")) {
    await ReportsPage.preload()
    return
  }
  if (pathname.startsWith("/customers/projects")) {
    await ProjectsPage.preload()
    return
  }
  await CustomersPage.preload()
}

function RemoteRoutes() {
  const { pathname } = useLocation()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>
        {pathname.startsWith("/customers/reports") ? (
          <ReportsPage />
        ) : pathname.startsWith("/customers/projects") ? (
          <ProjectsPage />
        ) : (
          <CustomersPage pathname={pathname} />
        )}
      </Suspense>
    </div>
  )
}

const RemoteRoutesWithPreload = attachPreload(RemoteRoutes, preload)

/**
 * Every remote mounts the shared TanStack Query client at its route root so
 * server-list pages can adopt @workspace/list-page without per-page wiring.
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
