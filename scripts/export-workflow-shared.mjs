import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const p = join(import.meta.dir, "../apps/workflow/src/features/workflow/shared/admin-ui.tsx")
let s = readFileSync(p, "utf8")

const names = [
  "WorkflowFrame",
  "CaseTypeTable",
  "SlaTable",
  "DescriptionTemplateTable",
  "ProcessRoleTable",
  "RoleCatalogTable",
  "RoleMembershipTable",
  "AssignmentRuleTable",
  "DelegationTable",
  "ProcessDefinitionsTable",
  "MonitoringDetail",
  "MonitoringCaseList",
  "ProcessDefinitionDialog",
  "CaseTypeDialog",
  "ProcessConfigDialog",
  "SlaPolicyDialog",
  "DescriptionTemplateDialog",
  "ProcessRoleDialog",
  "RoleCatalogDialog",
  "RoleMembershipDialog",
  "AssignmentRuleDialog",
  "DelegationDialog",
  "LoadingBlock",
  "EmptyState",
  "monitoringMetrics",
  "caseTypeOptionsFromCaseTypes",
  "roleOptionsFromCaseTypes",
  "uniqueOptions",
]

for (const n of names) {
  s = s.replace(`function ${n}(`, `export function ${n}(`)
}

s = s.replace(
  "const defaultBusinessAreaOptions",
  "export const defaultBusinessAreaOptions"
)
s = s.replace(
  "const businessSubsystemOptions",
  "export const businessSubsystemOptions"
)

writeFileSync(p, s)
console.log("exports added")
