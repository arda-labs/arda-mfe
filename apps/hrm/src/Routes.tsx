import "@workspace/i18n/apps/hrm"
import { Suspense } from "react"
import { useLocation } from "react-router-dom"
import {
  attachPreload,
  lazyWithPreload,
} from "@workspace/ui/lib/lazy"

const PositionsPage = lazyWithPreload(() =>
  import("@/features/hrm/positions/page").then((m) => ({
    default: m.PositionsPage,
  }))
)
const JobTitlesPage = lazyWithPreload(() =>
  import("@/features/hrm/job-titles/page").then((m) => ({
    default: m.JobTitlesPage,
  }))
)
const OrgUnitsPage = lazyWithPreload(() =>
  import("@/features/hrm/org-units/page").then((m) => ({
    default: m.OrgUnitsPage,
  }))
)
const RegistrationsPage = lazyWithPreload(() =>
  import("@/features/hrm/registrations/page").then((m) => ({
    default: m.RegistrationsPage,
  }))
)
const EmployeesPage = lazyWithPreload(() =>
  import("@/features/hrm/employees/page").then((m) => ({
    default: m.EmployeesPage,
  }))
)

async function preload(pathname = "") {
  let page = PositionsPage
  if (pathname.startsWith("/hrm/job-titles")) page = JobTitlesPage
  if (pathname.startsWith("/hrm/org-units")) page = OrgUnitsPage
  if (pathname.startsWith("/hrm/registrations")) page = RegistrationsPage
  if (pathname.startsWith("/hrm/employees")) page = EmployeesPage
  await page.preload()
}

function RemoteRoutes() {
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

const RemoteRoutesWithPreload = attachPreload(RemoteRoutes, preload)

export default RemoteRoutesWithPreload
