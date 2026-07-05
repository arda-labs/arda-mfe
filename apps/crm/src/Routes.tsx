import { lazy, Suspense } from "react"
import { usePathname } from "@workspace/core/routing"

const CustomersPage = lazy(() =>
  import("@/features/customers/page").then((m) => ({ default: m.CustomersPage }))
)
const WorkbenchPage = lazy(() =>
  import("@/features/workbench/page").then((m) => ({ default: m.WorkbenchPage }))
)

export default function Routes() {
  return (
    <div className="h-full min-h-0">
      <Suspense fallback={null}>
        <CrmRoutes />
      </Suspense>
    </div>
  )
}

function CrmRoutes() {
  const pathname = usePathname("/customers/registrations")

  if (pathname.startsWith("/workbench/")) {
    return <WorkbenchPage pathname={pathname} />
  }
  return <CustomersPage pathname={pathname} />
}
