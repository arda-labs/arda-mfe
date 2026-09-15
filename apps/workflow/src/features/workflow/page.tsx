import { Activity, Suspense, useState } from "react"
import { attachPreload, lazyWithPreload, RouteReady } from "@workspace/ui/lib/lazy"
import { RouteLoading } from "@workspace/ui/components/route-loading"
import { routeFromPath, type WorkflowRoute } from "./routes"

const pages = {
  "case-types": lazyWithPreload(() => import("./pages/case-types-page").then((m) => ({ default: m.CaseTypesPage }))),
  "process-configs": lazyWithPreload(() => import("./pages/process-configs-page").then((m) => ({ default: m.ProcessConfigsPage }))),
  "sla-policies": lazyWithPreload(() => import("./pages/sla-policies-page").then((m) => ({ default: m.SlaPoliciesPage }))),
  "description-templates": lazyWithPreload(() => import("./pages/description-templates-page").then((m) => ({ default: m.DescriptionTemplatesPage }))),
  roles: lazyWithPreload(() => import("./pages/process-roles-page").then((m) => ({ default: m.ProcessRolesPage }))),
  monitoring: lazyWithPreload(() => import("./pages/process-monitoring-page").then((m) => ({ default: m.ProcessMonitoringPage }))),
  dashboard: lazyWithPreload(() => import("./pages/dashboard-page").then((m) => ({ default: m.DashboardPage }))),
}

function WorkflowAdminView({ pathname }: { pathname: string }) {
  const route = routeFromPath(pathname)
  const [visited, setVisited] = useState<Set<WorkflowRoute>>(() => new Set([route]))
  if (!visited.has(route)) setVisited((previous) => new Set(previous).add(route))
  return (
    <Suspense fallback={<RouteLoading />}>
      {[...visited].map((key) => {
        const Page = pages[key]
        return <Activity key={key} mode={key === route ? "visible" : "hidden"}><Page /></Activity>
      })}
      <RouteReady pathname={pathname} />
    </Suspense>
  )
}
export const WorkflowAdminPage = attachPreload(WorkflowAdminView, async (pathname = "/workflow") => {
  await pages[routeFromPath(pathname)].preload()
})
