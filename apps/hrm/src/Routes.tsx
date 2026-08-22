import "@workspace/i18n/apps/hrm"
import { lazy, Suspense } from "react"
import { useLocation } from "react-router-dom"

const PositionsPage = lazy(() =>
  import("@/features/hrm/positions/page").then((m) => ({
    default: m.PositionsPage,
  }))
)
const JobTitlesPage = lazy(() =>
  import("@/features/hrm/job-titles/page").then((m) => ({
    default: m.JobTitlesPage,
  }))
)
const OrgUnitsPage = lazy(() =>
  import("@/features/hrm/org-units/page").then((m) => ({
    default: m.OrgUnitsPage,
  }))
)
const RegistrationsPage = lazy(() =>
  import("@/features/hrm/registrations/page").then((m) => ({
    default: m.RegistrationsPage,
  }))
)
const EmployeesPage = lazy(() =>
  import("@/features/hrm/employees/page").then((m) => ({
    default: m.EmployeesPage,
  }))
)

export default function RemoteRoutes() {
  const { pathname } = useLocation()

  let page = <PositionsPage />
  if (pathname.startsWith("/hrm/job-titles")) page = <JobTitlesPage />
  if (pathname.startsWith("/hrm/org-units")) page = <OrgUnitsPage />
  if (pathname.startsWith("/hrm/registrations")) page = <RegistrationsPage />
  if (pathname.startsWith("/hrm/employees")) page = <EmployeesPage />

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>{page}</Suspense>
    </div>
  )
}
