import {
  EmployeesPage,
  JobTitlesPage,
  OrgUnitsPage,
  PositionsPage,
  RegistrationsPage,
} from "@/features/hrm/pages"

function getPathname() {
  if (typeof window === "undefined") return "/hrm/positions"
  return window.location.pathname
}

export default function Routes() {
  const pathname = getPathname()

  if (pathname.startsWith("/hrm/job-titles")) return <JobTitlesPage />
  if (pathname.startsWith("/hrm/org-units")) return <OrgUnitsPage />
  if (pathname.startsWith("/hrm/registrations")) return <RegistrationsPage />
  if (pathname.startsWith("/hrm/employees")) return <EmployeesPage />
  return <PositionsPage />
}
