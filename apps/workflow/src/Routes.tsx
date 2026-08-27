import { registerAppLocales } from "@workspace/i18n"
import enWorkflow from "../locales/en-US.json"
import viWorkflow from "../locales/vi-VN.json"

registerAppLocales("workflow", {
  "vi-VN": viWorkflow,
  "en-US": enWorkflow,
})
import { Suspense } from "react"
import { useLocation } from "react-router-dom"
import { QueryProvider } from "@workspace/query/provider"
import { attachPreload, lazyWithPreload } from "@workspace/ui/lib/lazy"

const WorkflowAdminPage = lazyWithPreload(() =>
  import("@/features/workflow/page").then((m) => ({
    default: m.WorkflowAdminPage,
  }))
)
const WorkbenchPage = lazyWithPreload(() =>
  import("@/features/workbench/page").then((m) => ({
    default: m.WorkbenchPage,
  }))
)

async function preload(pathname = "") {
  if (pathname.startsWith("/workbench/")) {
    await WorkbenchPage.preload()
    return
  }
  await WorkflowAdminPage.preload()
}

function RemoteRoutes() {
  const { pathname } = useLocation()
  const page = pathname.startsWith("/workbench/") ? (
    <WorkbenchPage pathname={pathname} />
  ) : (
    <WorkflowAdminPage pathname={pathname} />
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>{page}</Suspense>
    </div>
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
