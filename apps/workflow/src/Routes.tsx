import { lazy, Suspense } from "react"

const WorkflowAdminPage = lazy(() =>
  import("@/features/workflow/page").then((m) => ({ default: m.WorkflowAdminPage }))
)

function getPathname() {
  if (typeof window === "undefined") return "/workflow/case-types"
  return window.location.pathname
}

export default function Routes() {
  const pathname = getPathname()

  return (
    <div className="h-full min-h-0">
      <Suspense fallback={null}>
        <WorkflowAdminPage pathname={pathname} />
      </Suspense>
    </div>
  )
}
