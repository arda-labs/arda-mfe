import "@workspace/i18n/apps/workflow"
import { Suspense } from "react"
import { useLocation } from "react-router-dom"
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

export default RemoteRoutesWithPreload
