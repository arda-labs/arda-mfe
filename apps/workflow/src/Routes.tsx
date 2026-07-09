import { lazy, Suspense } from "react"
import { usePathname } from "@workspace/core/routing"

const WorkflowAdminPage = lazy(() =>
  import("@/features/workflow/page").then((m) => ({ default: m.WorkflowAdminPage }))
)
const WorkbenchPage = lazy(() =>
  import("@/features/workbench/page").then((m) => ({ default: m.WorkbenchPage }))
)

export default function Routes() {
  const pathname = usePathname("/workflow/case-types")

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>
        {pathname.startsWith("/workbench/") ? (
          <WorkbenchPage pathname={pathname} />
        ) : (
          <WorkflowAdminPage pathname={pathname} />
        )}
      </Suspense>
    </div>
  )
}
