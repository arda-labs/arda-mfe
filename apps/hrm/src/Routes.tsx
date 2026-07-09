import { lazy, Suspense } from "react"
import { usePathname } from "@workspace/core/routing"

const PositionsPage = lazy(() =>
  import("@/features/hrm/positions/page").then((m) => ({ default: m.PositionsPage }))
)
const JobTitlesPage = lazy(() =>
  import("@/features/hrm/job-titles/page").then((m) => ({ default: m.JobTitlesPage }))
)
const OrgUnitsPage = lazy(() =>
  import("@/features/hrm/org-units/page").then((m) => ({ default: m.OrgUnitsPage }))
)
const RegistrationsPage = lazy(() =>
  import("@/features/hrm/registrations/page").then((m) => ({
    default: m.RegistrationsPage,
  }))
)
const EmployeesPage = lazy(() =>
  import("@/features/hrm/employees/page").then((m) => ({ default: m.EmployeesPage }))
)

export default function Routes() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>
        <HrmRoutes />
      </Suspense>
    </div>
  )
}

function HrmRoutes() {
  const pathname = usePathname("/hrm/positions")

  if (pathname.startsWith("/hrm/job-titles")) return <JobTitlesPage />
  if (pathname.startsWith("/hrm/org-units")) return <OrgUnitsPage />
  if (pathname.startsWith("/hrm/registrations")) return <RegistrationsPage />
  if (pathname.startsWith("/hrm/employees")) return <EmployeesPage />
  return <PositionsPage />
}
