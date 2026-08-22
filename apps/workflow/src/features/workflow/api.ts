import { apiUrl } from "@workspace/core/http/api-url"

export interface WorkflowCaseType {
  caseType: string
  businessArea: string
  operationName: string
  bpmnProcessId: string
  bpmnVersion: number
  workflowEnabled: boolean
  defaultSlaPolicyId?: string
  makerRole: string
  checkerRole: string
  ownerService: string
  status: string
  effectiveFrom: string
  effectiveTo?: string
}

export interface WorkflowCase {
  id: string
  caseType: string
  caseCode: string
  title: string
  primaryObjectType?: string
  primaryObjectId?: string
  domainService?: string
  status: string
  currentStep: string
  assignedTo?: string
  candidateRole?: string
  slaDueAt?: string
  processInstanceKey?: number
  bpmnProcessId?: string
  bpmnVersion?: number
  updatedAt: string
}

export interface ProcessInstancePendingJob {
  jobKey: string
  jobType: string
  elementId: string
  processInstanceKey: string
  caseId?: string
  retries: number
  state: string
  errorMessage?: string
}

export interface ProcessInstanceIncident {
  jobKey: string
  jobType: string
  elementId: string
  retries: number
  errorMessage: string
  createdAt: string
}

export interface ProcessInstanceRuntime {
  processInstanceKey: string
  zeebeStatus: "ok" | "unreachable" | string
  activeElementId?: string
  case?: WorkflowCase | null
  activeWorkTask?: {
    id: string
    taskType?: string
    stepCode: string
    jobKey?: string
    status: string
    candidateRole?: string
  } | null
  pendingJobs: ProcessInstancePendingJob[]
  incidents: ProcessInstanceIncident[]
  pendingJobsError?: string
  timeline?: Array<{
    id: number
    eventType: string
    note?: string
    createdAt: string
  }>
  hint: string
  workerNote: string
}

export interface SlaPolicy {
  id: string
  code: string
  name: string
  caseType: string
  dueInHours: number
  warningInHours: number
  escalationRole: string
  status: string
  effectiveFrom?: string
  effectiveTo?: string
  taskPolicies?: SlaTaskPolicy[]
}

export interface SlaTaskPolicy {
  id?: string
  slaPolicyId?: string
  stepCode: string
  taskName: string
  durationValue: number
  durationUnit: "MINUTE" | "HOUR"
  warningMode: "ABSOLUTE" | "PERCENT"
  warningValue: number
  warningUnit: "MINUTE" | "HOUR" | "PERCENT"
  escalationRole: string
  sortOrder: number
  status: string
  effectiveFrom?: string
  effectiveTo?: string
}

export interface DescriptionTemplate {
  id: string
  code: string
  businessSubsystem: string
  caseType: string
  pattern: string
  preview: string
  status: string
}

export interface ProcessRole {
  id: string
  caseType: string
  stepCode: string
  businessRole: string
  iamRole: string
  actionScope: string
  status: string
}

export interface WorkflowRoleCatalog {
  roleCode: string
  roleName: string
  roleType: string
  businessSubsystem: string
  status: string
}

export interface WorkflowRoleMembership {
  id: string
  roleCode: string
  principalType: string
  principalId: string
  tenantId: string
  orgId: string
  branchId: string
  productCode: string
  minAmount?: number
  maxAmount?: number
  effectiveFrom?: string
  effectiveTo?: string
  status: string
}

export interface WorkflowAssignmentRule {
  id: string
  caseType: string
  stepCode: string
  roleCode: string
  assignmentMode: string
  requireSeparationOfDuties: boolean
  fallbackRoleCode: string
  priority: number
  status: string
}

export interface WorkflowDelegation {
  id: string
  fromPrincipalId: string
  toPrincipalId: string
  roleCode: string
  effectiveFrom?: string
  effectiveTo?: string
  reason: string
  status: string
}

export interface WorkflowProcessDefinition {
  id: string
  processCode: string
  name: string
  bpmnProcessId: string
  version: number
  resourceName: string
  xmlContent?: string
  deploymentKey?: number
  status: string
  deployedAt?: string
  createdAt?: string
  updatedAt?: string
}

// --- Operate-specific types (Camunda Operate style) ---

export interface ProcessInstanceState {
  processInstanceKey: string
  processDefinitionKey: string
  bpmnProcessId: string
  version: number
  businessKey?: string
  state: "ACTIVE" | "COMPLETED" | "CANCELED" | "SUSPENDED" | "INCIDENT"
  elementId?: string
  startTime: string
  endTime?: string
  runningDuration?: string
  variables?: Record<string, unknown>
}

export interface IncidentState {
  incidentKey: string
  processInstanceKey: string
  processDefinitionKey: string
  bpmnProcessId: string
  elementId: string
  elementInstanceKey: string
  jobKey?: string
  errorType: string
  errorMessage: string
  state: "CREATED" | "RESOLVED" | "PENDING"
  createdAt: string
  resolvedAt?: string
  retries?: number
}

export interface JobState {
  jobKey: string
  type: string
  processInstanceKey: string
  processDefinitionKey: string
  bpmnProcessId: string
  elementId: string
  elementInstanceKey: string
  state: "ACTIVATABLE" | "ACTIVATED" | "FAILED" | "ERROR_THROWN" | "SUSPENDED"
  retries: number
  maxRetries: number
  createdAt: string
  deadline?: string
  worker?: string
  errorMessage?: string
  customHeaders?: Record<string, string>
}

export interface JobDefinitionState {
  jobDefinitionKey: string
  type: string
  processDefinitionKey: string
  bpmnProcessId: string
  worker?: string
  state: "ACTIVE" | "SUSPENDED"
  retries: number
  createdAt: string
}

export interface ElementInstanceStat {
  bpmnProcessId: string
  elementId: string
  elementName: string
  elementType: string
  activeCount: number
  completedCount: number
  incidentCount: number
  totalCount: number
}

export interface ProcessDefinitionOperate {
  id: string
  processCode: string
  name: string
  bpmnProcessId: string
  version: number
  resourceName: string
  status: string
  deploymentKey?: number
  deployedAt?: string
  instanceCount: number
  incidentCount: number
  activeCount: number
  elementStats: ElementInstanceStat[]
}

export interface ProcessMetric {
  label: string
  value: string
  tone: "default" | "success" | "warning" | "error"
}

export type ProcessDefinitionUploadPayload = {
  processCode?: string
  name: string
  status: string
  file: File
}

// ─── API helpers ─────────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options?: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown }
) {
  const method = options?.method ?? "GET"
  const response = await fetch(apiUrl(path), {
    method,
    credentials: "include",
    headers:
      options?.body === undefined
        ? undefined
        : { "Content-Type": "application/json" },
    body:
      options?.body === undefined ? undefined : JSON.stringify(options.body),
  })
  if (!response.ok) {
    const message = await response.text().catch(() => "")
    throw new Error(message || `Request failed with status ${response.status}`)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

async function requestText(path: string) {
  const response = await fetch(apiUrl(path), { credentials: "include" })
  if (!response.ok) {
    const message = await response.text().catch(() => "")
    throw new Error(message || `Request failed with status ${response.status}`)
  }
  return response.text()
}

async function uploadProcessDefinition(
  path: string,
  method: "POST" | "PUT",
  payload: ProcessDefinitionUploadPayload
) {
  const body = new FormData()
  if (payload.processCode) body.set("processCode", payload.processCode)
  body.set("name", payload.name)
  body.set("status", payload.status)
  body.set("file", payload.file)

  const response = await fetch(apiUrl(path), {
    method,
    credentials: "include",
    body,
  })
  if (!response.ok) {
    const message = await response.text().catch(() => "")
    throw new Error(message || `Request failed with status ${response.status}`)
  }
  return (await response.json()) as WorkflowProcessDefinition
}

// ─── API methods ─────────────────────────────────────────────────────────────────

export const workflowApi = {
  async listCaseTypes() {
    return request<WorkflowCaseType[]>("/api/workflow/case-types")
  },
  async listCases() {
    return request<WorkflowCase[]>("/api/workflow/cases?limit=100")
  },
  getProcessInstanceRuntime(processInstanceKey: string | number) {
    return request<ProcessInstanceRuntime>(
      `/api/workflow/process-instances/${encodeURIComponent(String(processInstanceKey))}/runtime`
    )
  },
  retryWorkflowJob(jobKey: string, retries = 3) {
    return request<{ status: string; jobKey: string; retries: number }>(
      `/api/workflow/jobs/${encodeURIComponent(jobKey)}/retry`,
      { method: "POST", body: { retries } }
    )
  },
  retryProcessServiceJobs(processInstanceKey: string | number) {
    return request<{ status: string; retried: string[]; message?: string }>(
      `/api/workflow/process-instances/${encodeURIComponent(String(processInstanceKey))}/retry-service-jobs`,
      { method: "POST" }
    )
  },
  async listSlaPolicies() {
    return request<SlaPolicy[]>("/api/workflow/sla-policies")
  },
  async listDescriptionTemplates() {
    return request<DescriptionTemplate[]>("/api/workflow/description-templates")
  },
  async listProcessRoles() {
    return request<ProcessRole[]>("/api/workflow/roles")
  },
  async listRoleCatalog() {
    return request<WorkflowRoleCatalog[]>("/api/workflow/role-catalog")
  },
  async listRoleMemberships() {
    return request<WorkflowRoleMembership[]>("/api/workflow/role-memberships")
  },
  async listAssignmentRules() {
    return request<WorkflowAssignmentRule[]>("/api/workflow/assignment-rules")
  },
  async listDelegations() {
    return request<WorkflowDelegation[]>("/api/workflow/delegations")
  },
  async listProcessDefinitions() {
    return request<WorkflowProcessDefinition[]>(
      "/api/workflow/process-definitions"
    )
  },
  getProcessDefinitionXml(id: string) {
    return requestText(
      `/api/workflow/process-definitions/${encodeURIComponent(id)}/xml`
    )
  },
  importProcessDefinition(payload: ProcessDefinitionUploadPayload) {
    return uploadProcessDefinition(
      "/api/workflow/process-definitions",
      "POST",
      payload
    )
  },
  updateProcessDefinition(id: string, payload: ProcessDefinitionUploadPayload) {
    return uploadProcessDefinition(
      `/api/workflow/process-definitions/${encodeURIComponent(id)}`,
      "PUT",
      payload
    )
  },
  deployProcessDefinition(id: string) {
    return request<WorkflowProcessDefinition>(
      `/api/workflow/process-definitions/${encodeURIComponent(id)}/deploy`,
      { method: "POST" }
    )
  },
  deleteProcessDefinition(id: string) {
    return request<void>(
      `/api/workflow/process-definitions/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      }
    )
  },

  // --- Operate API methods ---

  listOperateProcessDefinitions() {
    return request<ProcessDefinitionOperate[]>(
      "/api/workflow/operate/process-definitions"
    )
  },
  listOperateProcessInstances(bpmnProcessId?: string) {
    const path =
      "/api/workflow/operate/process-instances" +
      (bpmnProcessId
        ? `?bpmnProcessId=${encodeURIComponent(bpmnProcessId)}`
        : "")
    return request<ProcessInstanceState[]>(path)
  },
  getOperateProcessInstance(key: string) {
    return request<ProcessInstanceState>(
      `/api/workflow/operate/process-instances/${encodeURIComponent(key)}`
    )
  },
  listOperateIncidents(bpmnProcessId?: string) {
    const path =
      "/api/workflow/operate/incidents" +
      (bpmnProcessId
        ? `?bpmnProcessId=${encodeURIComponent(bpmnProcessId)}`
        : "")
    return request<IncidentState[]>(path)
  },
  listOperateJobs(bpmnProcessId?: string) {
    const path =
      "/api/workflow/operate/jobs" +
      (bpmnProcessId
        ? `?bpmnProcessId=${encodeURIComponent(bpmnProcessId)}`
        : "")
    return request<JobState[]>(path)
  },
  listOperateJobDefinitions(bpmnProcessId?: string) {
    const path =
      "/api/workflow/operate/job-definitions" +
      (bpmnProcessId
        ? `?bpmnProcessId=${encodeURIComponent(bpmnProcessId)}`
        : "")
    return request<JobDefinitionState[]>(path)
  },
  listElementInstanceStats(bpmnProcessId?: string) {
    const path =
      "/api/workflow/operate/element-stats" +
      (bpmnProcessId
        ? `?bpmnProcessId=${encodeURIComponent(bpmnProcessId)}`
        : "")
    return request<ElementInstanceStat[]>(path)
  },
  pauseProcessInstance(key: string) {
    return request<{ status: string }>(
      `/api/workflow/operate/process-instances/${encodeURIComponent(key)}/pause`,
      { method: "POST" }
    )
  },
  resumeProcessInstance(key: string) {
    return request<{ status: string }>(
      `/api/workflow/operate/process-instances/${encodeURIComponent(key)}/resume`,
      { method: "POST" }
    )
  },
  cancelProcessInstance(key: string) {
    return request<{ status: string }>(
      `/api/workflow/operate/process-instances/${encodeURIComponent(key)}/cancel`,
      { method: "POST" }
    )
  },
  deleteProcessInstance(key: string) {
    return request<void>(
      `/api/workflow/operate/process-instances/${encodeURIComponent(key)}`,
      { method: "DELETE" }
    )
  },
  retryIncident(incidentKey: string) {
    return request<{ status: string }>(
      `/api/workflow/operate/incidents/${encodeURIComponent(incidentKey)}/retry`,
      { method: "POST" }
    )
  },
  resolveIncident(incidentKey: string) {
    return request<{ status: string }>(
      `/api/workflow/operate/incidents/${encodeURIComponent(incidentKey)}/resolve`,
      { method: "POST" }
    )
  },
  updateJobRetries(jobKey: string, retries: number) {
    return request<{ status: string }>(
      `/api/workflow/operate/jobs/${encodeURIComponent(jobKey)}/retries`,
      {
        method: "PUT",
        body: { retries },
      }
    )
  },
  suspendJobDefinition(jobDefinitionKey: string) {
    return request<{ status: string }>(
      `/api/workflow/operate/job-definitions/${encodeURIComponent(jobDefinitionKey)}/suspend`,
      { method: "POST" }
    )
  },
  activateJobDefinition(jobDefinitionKey: string) {
    return request<{ status: string }>(
      `/api/workflow/operate/job-definitions/${encodeURIComponent(jobDefinitionKey)}/activate`,
      { method: "POST" }
    )
  },
  createCaseType(
    payload: Omit<WorkflowCaseType, "effectiveFrom" | "effectiveTo">
  ) {
    return request<WorkflowCaseType>("/api/workflow/case-types", {
      method: "POST",
      body: payload,
    })
  },
  updateCaseType(
    caseType: string,
    payload: Omit<
      WorkflowCaseType,
      "caseType" | "effectiveFrom" | "effectiveTo"
    >
  ) {
    return request<WorkflowCaseType>(
      `/api/workflow/case-types/${encodeURIComponent(caseType)}`,
      { method: "PUT", body: payload }
    )
  },
  updateProcessConfig(caseType: string, payload: Partial<WorkflowCaseType>) {
    return request<WorkflowCaseType>(
      `/api/workflow/case-types/${encodeURIComponent(caseType)}/process-config`,
      { method: "PUT", body: payload }
    )
  },
  createSlaPolicy(payload: Omit<SlaPolicy, "id" | "createdAt" | "updatedAt">) {
    return request<SlaPolicy>("/api/workflow/sla-policies", {
      method: "POST",
      body: payload,
    })
  },
  updateSlaPolicy(
    id: string,
    payload: Omit<SlaPolicy, "id" | "createdAt" | "updatedAt">
  ) {
    return request<SlaPolicy>(
      `/api/workflow/sla-policies/${encodeURIComponent(id)}`,
      { method: "PUT", body: payload }
    )
  },
  createDescriptionTemplate(
    payload: Omit<DescriptionTemplate, "id" | "createdAt" | "updatedAt">
  ) {
    return request<DescriptionTemplate>("/api/workflow/description-templates", {
      method: "POST",
      body: payload,
    })
  },
  updateDescriptionTemplate(
    id: string,
    payload: Omit<DescriptionTemplate, "id" | "createdAt" | "updatedAt">
  ) {
    return request<DescriptionTemplate>(
      `/api/workflow/description-templates/${encodeURIComponent(id)}`,
      { method: "PUT", body: payload }
    )
  },
  createProcessRole(
    payload: Omit<ProcessRole, "id" | "createdAt" | "updatedAt">
  ) {
    return request<ProcessRole>("/api/workflow/roles", {
      method: "POST",
      body: payload,
    })
  },
  updateProcessRole(
    id: string,
    payload: Omit<ProcessRole, "id" | "createdAt" | "updatedAt">
  ) {
    return request<ProcessRole>(
      `/api/workflow/roles/${encodeURIComponent(id)}`,
      { method: "PUT", body: payload }
    )
  },
  createRoleCatalog(payload: WorkflowRoleCatalog) {
    return request<WorkflowRoleCatalog>("/api/workflow/role-catalog", {
      method: "POST",
      body: payload,
    })
  },
  updateRoleCatalog(roleCode: string, payload: WorkflowRoleCatalog) {
    return request<WorkflowRoleCatalog>(
      `/api/workflow/role-catalog/${encodeURIComponent(roleCode)}`,
      { method: "PUT", body: payload }
    )
  },
  createRoleMembership(payload: Omit<WorkflowRoleMembership, "id">) {
    return request<WorkflowRoleMembership>("/api/workflow/role-memberships", {
      method: "POST",
      body: payload,
    })
  },
  updateRoleMembership(
    id: string,
    payload: Omit<WorkflowRoleMembership, "id">
  ) {
    return request<WorkflowRoleMembership>(
      `/api/workflow/role-memberships/${encodeURIComponent(id)}`,
      { method: "PUT", body: payload }
    )
  },
  createAssignmentRule(payload: Omit<WorkflowAssignmentRule, "id">) {
    return request<WorkflowAssignmentRule>("/api/workflow/assignment-rules", {
      method: "POST",
      body: payload,
    })
  },
  updateAssignmentRule(
    id: string,
    payload: Omit<WorkflowAssignmentRule, "id">
  ) {
    return request<WorkflowAssignmentRule>(
      `/api/workflow/assignment-rules/${encodeURIComponent(id)}`,
      { method: "PUT", body: payload }
    )
  },
  createDelegation(payload: Omit<WorkflowDelegation, "id">) {
    return request<WorkflowDelegation>("/api/workflow/delegations", {
      method: "POST",
      body: payload,
    })
  },
  updateDelegation(id: string, payload: Omit<WorkflowDelegation, "id">) {
    return request<WorkflowDelegation>(
      `/api/workflow/delegations/${encodeURIComponent(id)}`,
      { method: "PUT", body: payload }
    )
  },
}
