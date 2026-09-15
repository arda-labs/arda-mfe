import { createAppLocaleLoader } from "@workspace/i18n"
import { QueryProvider } from "@workspace/query/provider"
import { createRemoteRoutes, lazyWithPreload } from "@workspace/ui/lib/lazy"

const locales = createAppLocaleLoader("workflow", {
  "vi-VN": () => import("../locales/vi-VN.json"),
  "en-US": () => import("../locales/en-US.json"),
})
const WorkflowAdminPage = lazyWithPreload(() => import("@/features/workflow/page").then((m) => ({ default: m.WorkflowAdminPage })))
const WorkbenchPage = lazyWithPreload(() => import("@/features/workbench/page").then((m) => ({ default: m.WorkbenchPage })))

export default createRemoteRoutes({
  deferReady: true,
  locales, wrapper: QueryProvider, defaultComponent: WorkflowAdminPage,
  defaultPrefixes: ["/workflow"],
  routes: [
    { prefix: "/workflow/case-types", component: WorkflowAdminPage },
    { prefix: "/workflow/process-configs", component: WorkflowAdminPage },
    { prefix: "/workflow/sla-policies", component: WorkflowAdminPage },
    { prefix: "/workflow/description-templates", component: WorkflowAdminPage },
    { prefix: "/workflow/roles", component: WorkflowAdminPage },
    { prefix: "/workflow/monitoring", component: WorkflowAdminPage },
    { prefix: "/workflow/dashboard", component: WorkflowAdminPage },
    { prefix: "/workbench", component: WorkbenchPage },
  ],
})
