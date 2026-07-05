import { lazy, Suspense } from "react"
import { usePathname } from "@workspace/core/routing"

const WorkflowAdminPage = lazy(() =>
  import("@/features/workflow/page").then((m) => ({ default: m.WorkflowAdminPage }))
)

export default function Routes() {
  const pathname = usePathname("/workflow/case-types")

  return (
    <div className="h-full min-h-0">
      <Suspense fallback={null}>
        <WorkflowAdminPage pathname={pathname} />
      </Suspense>
    </div>
  )
}
