export type WorkflowRoute =
  | "case-types"
  | "process-configs"
  | "sla-policies"
  | "description-templates"
  | "roles"
  | "monitoring"

export function routeFromPath(pathname: string): WorkflowRoute {
  if (pathname.startsWith("/workflow/process-configs")) return "process-configs"
  if (pathname.startsWith("/workflow/sla-policies")) return "sla-policies"
  if (pathname.startsWith("/workflow/description-templates"))
    return "description-templates"
  if (pathname.startsWith("/workflow/roles")) return "roles"
  if (pathname.startsWith("/workflow/monitoring")) return "monitoring"
  return "case-types"
}
