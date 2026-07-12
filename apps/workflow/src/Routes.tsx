import { lazy, Suspense } from "react"
import { useLocation } from "react-router-dom"

const WorkflowAdminPage = lazy(() =>
  import("@/features/workflow/page").then((m) => ({ default: m.WorkflowAdminPage }))
)
const WorkbenchPage = lazy(() =>
  import("@/features/workbench/page").then((m) => ({ default: m.WorkbenchPage }))
)

export default function RemoteRoutes() {
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
