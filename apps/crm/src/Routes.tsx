import { lazy, Suspense } from "react"

const CustomersPage = lazy(() =>
  import("@/features/customers/page").then((m) => ({ default: m.CustomersPage }))
)
const WorkbenchPage = lazy(() =>
  import("@/features/workbench/page").then((m) => ({ default: m.WorkbenchPage }))
)

function getPathname() {
  if (typeof window === "undefined") return "/customers/registrations"
  return window.location.pathname
}

export default function Routes() {
  const pathname = getPathname()

  return (
    <div className="h-full min-h-0">
      <Suspense fallback={null}>
        <CrmRoutes pathname={pathname} />
      </Suspense>
    </div>
  )
}

function CrmRoutes({ pathname }: { pathname: string }) {
  if (pathname.startsWith("/workbench/")) {
    return <WorkbenchPage pathname={pathname} />
  }
  return <CustomersPage pathname={pathname} />
}
