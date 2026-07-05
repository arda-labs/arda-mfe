import { Activity, lazy, Suspense, useState } from "react"
import { routeFromPath, type WorkflowRoute } from "./routes"

const CaseTypesPage = lazy(() =>
  import("./pages/case-types-page").then((m) => ({ default: m.CaseTypesPage }))
)
const ProcessConfigsPage = lazy(() =>
  import("./pages/process-configs-page").then((m) => ({ default: m.ProcessConfigsPage }))
)
const SlaPoliciesPage = lazy(() =>
  import("./pages/sla-policies-page").then((m) => ({ default: m.SlaPoliciesPage }))
)
const DescriptionTemplatesPage = lazy(() =>
  import("./pages/description-templates-page").then((m) => ({
    default: m.DescriptionTemplatesPage,
  }))
)
const ProcessRolesPage = lazy(() =>
  import("./pages/process-roles-page").then((m) => ({ default: m.ProcessRolesPage }))
)
const ProcessMonitoringPage = lazy(() =>
  import("./pages/process-monitoring-page").then((m) => ({
    default: m.ProcessMonitoringPage,
  }))
)

function RoutePage({ route }: { route: WorkflowRoute }) {
  switch (route) {
    case "process-configs":
      return <ProcessConfigsPage />
    case "sla-policies":
      return <SlaPoliciesPage />
    case "description-templates":
      return <DescriptionTemplatesPage />
    case "roles":
      return <ProcessRolesPage />
    case "monitoring":
      return <ProcessMonitoringPage />
    default:
      return <CaseTypesPage />
  }
}

export function WorkflowAdminPage({ pathname }: { pathname: string }) {
  const route = routeFromPath(pathname)
  const [visited, setVisited] = useState<Set<WorkflowRoute>>(() => new Set([route]))

  if (!visited.has(route)) {
    setVisited((prev) => new Set(prev).add(route))
  }

  return (
    <Suspense fallback={null}>
      {([...visited] as WorkflowRoute[]).map((key) => (
        <Activity key={key} mode={key === route ? "visible" : "hidden"}>
          <RoutePage route={key} />
        </Activity>
      ))}
    </Suspense>
  )
}
