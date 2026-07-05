/**
 * One-time helper: split workflow/page.tsx into shared modules + route pages.
 * Run: bun scripts/split-workflow-page.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"

const root = join(import.meta.dir, "..")
const src = join(root, "apps/workflow/src/features/workflow/page.tsx")
const content = readFileSync(src, "utf8")

const lines = content.split("\n")

function extractLines(start, end) {
  return lines.slice(start - 1, end).join("\n")
}

const sharedDir = join(root, "apps/workflow/src/features/workflow/shared")
const pagesDir = join(root, "apps/workflow/src/features/workflow/pages")
for (const dir of [sharedDir, pagesDir]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

const imports = extractLines(1, 111)

const pageBlocks = [
  { name: "case-types-page", fn: "CaseTypesPage", start: 132, end: 181 },
  { name: "process-configs-page", fn: "ProcessConfigsPage", start: 183, end: 227 },
  { name: "sla-policies-page", fn: "SlaPoliciesPage", start: 229, end: 265 },
  {
    name: "description-templates-page",
    fn: "DescriptionTemplatesPage",
    start: 267,
    end: 306,
  },
  { name: "process-roles-page", fn: "ProcessRolesPage", start: 308, end: 426 },
  {
    name: "process-monitoring-page",
    fn: "ProcessMonitoringPage",
    start: 428,
    end: 569,
  },
]

const sharedStart = 571
const sharedEnd = 2650
const routeFn = extractLines(2652, 2659)

const sharedBody = extractLines(sharedStart, sharedEnd)

writeFileSync(
  join(sharedDir, "admin-ui.tsx"),
  `${imports.replace(
    './components/bpmn-monitor"',
    './components/bpmn-monitor-lazy"'
  )}

${sharedBody}

export {
  WorkflowFrame,
  LoadingBlock,
  EmptyState,
  CaseTypeTable,
  SlaTable,
  DescriptionTemplateTable,
  ProcessRoleTable,
  RoleCatalogTable,
  RoleMembershipTable,
  AssignmentRuleTable,
  DelegationTable,
  ProcessDefinitionsTable,
  MonitoringDetail,
  MonitoringCaseList,
  ProcessDefinitionDialog,
  CaseTypeDialog,
  ProcessConfigDialog,
  SlaPolicyDialog,
  DescriptionTemplateDialog,
  ProcessRoleDialog,
  RoleCatalogDialog,
  RoleMembershipDialog,
  AssignmentRuleDialog,
  DelegationDialog,
  StatusBadge,
  navigateTo,
  monitoringMetrics,
  uniqueOptions,
  roleOptionsFromCaseTypes,
  caseTypeOptionsFromCaseTypes,
  defaultBusinessAreaOptions,
  businessSubsystemOptions,
}
`
)

for (const block of pageBlocks) {
  const body = extractLines(block.start, block.end)
  const isMonitoring = block.name === "process-monitoring-page"
  const bpmnImport = isMonitoring
    ? `import { BpmnDefinitionViewerDialog, BpmnViewerPanel } from "../components/bpmn-monitor-lazy"\n`
    : ""

  writeFileSync(
    join(pagesDir, `${block.name}.tsx`),
    `import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Download, Edit, Eye, FileUp, Plus, RefreshCw, Trash2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import type {
  DescriptionTemplate,
  ProcessRole,
  SlaPolicy,
  WorkflowAssignmentRule,
  WorkflowCase,
  WorkflowCaseType,
  WorkflowDelegation,
  WorkflowProcessDefinition,
  WorkflowRoleCatalog,
  WorkflowRoleMembership,
} from "../api"
import {
  useAssignmentRules,
  useDelegations,
  useDescriptionTemplates,
  useProcessRoles,
  useProcessDefinitionXml,
  useProcessDefinitions,
  useRoleCatalog,
  useRoleMemberships,
  useSaveCaseType,
  useSlaPolicies,
  useWorkflowCases,
  useWorkflowCaseTypes,
} from "../queries"
import {
  AssignmentRuleDialog,
  AssignmentRuleTable,
  CaseTypeDialog,
  CaseTypeTable,
  DelegationDialog,
  DelegationTable,
  DescriptionTemplateDialog,
  DescriptionTemplateTable,
  EmptyState,
  LoadingBlock,
  MonitoringCaseList,
  MonitoringDetail,
  ProcessConfigDialog,
  ProcessDefinitionDialog,
  ProcessDefinitionsTable,
  ProcessRoleDialog,
  ProcessRoleTable,
  RoleCatalogDialog,
  RoleCatalogTable,
  RoleMembershipDialog,
  RoleMembershipTable,
  SlaPolicyDialog,
  SlaTable,
  WorkflowFrame,
  businessSubsystemOptions,
  caseTypeOptionsFromCaseTypes,
  defaultBusinessAreaOptions,
  monitoringMetrics,
  roleOptionsFromCaseTypes,
  uniqueOptions,
} from "../shared/admin-ui"
${isMonitoring ? 'import { ProcessInstanceOperate } from "../components/process-instance-operate"\n' : ""}${bpmnImport}
${body.replace(/^function /, "export function ")}
`
  )
}

const routerPage = `import { Activity, lazy, Suspense, useState } from "react"
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
`

writeFileSync(
  join(root, "apps/workflow/src/features/workflow/routes.ts"),
  `export type WorkflowRoute =
  | "case-types"
  | "process-configs"
  | "sla-policies"
  | "description-templates"
  | "roles"
  | "monitoring"

${routeFn.replace(/^function routeFromPath/, "export function routeFromPath")}
`
)

writeFileSync(join(root, "apps/workflow/src/features/workflow/page.tsx"), routerPage)

console.log("Split complete. Review shared/admin-ui.tsx and page imports, then delete backup if OK.")
