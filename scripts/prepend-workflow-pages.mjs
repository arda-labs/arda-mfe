import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const dir = join(import.meta.dir, "../apps/workflow/src/features/workflow/pages")

const headers = {
  "case-types-page.tsx": `import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type { WorkflowCaseType } from "../api"
import { useWorkflowCaseTypes } from "../queries"
import {
  CaseTypeDialog,
  CaseTypeTable,
  defaultBusinessAreaOptions,
  LoadingBlock,
  roleOptionsFromCaseTypes,
  uniqueOptions,
  WorkflowFrame,
} from "../shared/admin-ui"

`,
  "process-configs-page.tsx": `import { useState } from "react"
import type { WorkflowCaseType } from "../api"
import { useSlaPolicies, useWorkflowCaseTypes } from "../queries"
import {
  CaseTypeTable,
  LoadingBlock,
  ProcessConfigDialog,
  roleOptionsFromCaseTypes,
  WorkflowFrame,
} from "../shared/admin-ui"

`,
  "sla-policies-page.tsx": `import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type { SlaPolicy } from "../api"
import { useSlaPolicies, useWorkflowCaseTypes } from "../queries"
import {
  caseTypeOptionsFromCaseTypes,
  LoadingBlock,
  SlaPolicyDialog,
  SlaTable,
  uniqueOptions,
  WorkflowFrame,
} from "../shared/admin-ui"

`,
  "description-templates-page.tsx": `import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type { DescriptionTemplate } from "../api"
import { useDescriptionTemplates, useWorkflowCaseTypes } from "../queries"
import {
  businessSubsystemOptions,
  caseTypeOptionsFromCaseTypes,
  DescriptionTemplateDialog,
  DescriptionTemplateTable,
  LoadingBlock,
  WorkflowFrame,
} from "../shared/admin-ui"

`,
  "process-roles-page.tsx": `import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type {
  ProcessRole,
  WorkflowAssignmentRule,
  WorkflowDelegation,
  WorkflowRoleCatalog,
  WorkflowRoleMembership,
} from "../api"
import {
  useAssignmentRules,
  useDelegations,
  useProcessRoles,
  useRoleCatalog,
  useRoleMemberships,
  useWorkflowCaseTypes,
} from "../queries"
import {
  AssignmentRuleDialog,
  AssignmentRuleTable,
  caseTypeOptionsFromCaseTypes,
  DelegationDialog,
  DelegationTable,
  LoadingBlock,
  ProcessRoleDialog,
  ProcessRoleTable,
  RoleCatalogDialog,
  RoleCatalogTable,
  RoleMembershipDialog,
  RoleMembershipTable,
  uniqueOptions,
  WorkflowFrame,
} from "../shared/admin-ui"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

`,
  "process-monitoring-page.tsx": `import { Activity, useMemo, useState } from "react"
import { FileUp, RefreshCw } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import type { WorkflowCase, WorkflowProcessDefinition } from "../api"
import {
  BpmnDefinitionViewerDialog,
  BpmnViewerPanel,
} from "../components/bpmn-monitor-lazy"
import { ProcessInstanceOperate } from "../components/process-instance-operate"
import {
  useProcessDefinitionXml,
  useProcessDefinitions,
  useWorkflowCases,
  useWorkflowCaseTypes,
} from "../queries"
import {
  EmptyState,
  LoadingBlock,
  MonitoringCaseList,
  MonitoringDetail,
  ProcessDefinitionDialog,
  ProcessDefinitionsTable,
  WorkflowFrame,
  monitoringMetrics,
} from "../shared/admin-ui"

`,
}

for (const [file, header] of Object.entries(headers)) {
  const path = join(dir, file)
  const body = readFileSync(path, "utf8")
  writeFileSync(path, header + body)
}

console.log("headers added")
