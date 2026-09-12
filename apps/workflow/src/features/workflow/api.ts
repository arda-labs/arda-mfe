import { api, type ApiSuccess } from "@workspace/api"

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
  tenantId: string
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
  elementId?: string
  elementName?: string
  version?: number
  worker?: string
  state: "ACTIVE" | "SUSPENDED"
  retries: number
  createdAt: string
}

export interface WorkflowTimelineEvent {
  id: number
  caseId: string
  eventType: string
  fromStatus?: string
  toStatus?: string
  actor?: string
  note: string
  data?: unknown
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

// --- Runtime monitoring read model (Zeebe exporter backed) ---

export interface OperateInstance {
  processInstanceKey: string
  processDefinitionKey?: string
  bpmnProcessId: string
  version: number
  state: string
  startTime: string
  endTime?: string
  parentProcessInstanceKey?: string
  caseId?: string
  businessKey?: string
  caseType?: string
  caseStatus?: string
  openIncidents: number
}

export interface OperateInstancePage {
  items: OperateInstance[]
  nextCursor?: string
  source: string
}

export interface OperateInstanceDetail extends OperateInstance {
  title?: string
  slaDueAt?: string
}

export interface OperateIncidentRow {
  incidentKey: string
  processInstanceKey: string
  bpmnProcessId?: string
  elementId?: string
  elementInstanceKey?: string
  jobKey?: string
  errorType?: string
  errorMessage?: string
  state: string
  createdAt?: string
  caseId?: string
  businessKey?: string
}

export interface OperateIncidentPage {
  items: OperateIncidentRow[]
  nextCursor?: string
  source: string
}

export interface OperateElementInstance {
  elementInstanceKey: string
  elementId: string
  bpmnElementType: string
  state: string
  startTime: string
  endTime?: string
  flowScopeKey?: string
}

export interface OperateVariable {
  name: string
  value: string
  scopeKey: string
  updatedAt: string
}

export interface OperateJob {
  jobKey: string
  type: string
  state: string
  retries: number
  worker?: string
  elementId?: string
  elementInstanceKey?: string
  processInstanceKey: string
  bpmnProcessId?: string
  errorMessage?: string
  createdAt: string
  updatedAt?: string
}

export interface OperateInstanceQuery {
  state?: string
  bpmnProcessId?: string
  processDefinitionKey?: string
  processInstanceKey?: string
  parentProcessInstanceKey?: string
  startFrom?: string
  startTo?: string
  pageSize?: number
  cursor?: string
}

export interface OperateIncidentQuery {
  state?: string
  errorType?: string
  bpmnProcessId?: string
  processInstanceKey?: string
  from?: string
  to?: string
  pageSize?: number
  cursor?: string
}

export interface OperateJobQuery {
  state?: string
  type?: string
  bpmnProcessId?: string
  processInstanceKey?: string
  elementId?: string
  pageSize?: number
  cursor?: string
}

export interface OperateJobPage {
  items: OperateJob[]
  nextCursor?: string
  source: string
}

export interface OperateHistoryEvent {
  position: string
  timestamp: string
  valueType: string
  intent: string
  elementId?: string
  jobType?: string
  errorMessage?: string
  variableName?: string
  variableValue?: string
  userTaskKey?: string
}

export interface OperateHistoryPage {
  items: OperateHistoryEvent[]
  nextCursor?: string
}

export interface OperateUserTaskRow {
  userTaskKey: string
  elementId?: string
  elementInstanceKey?: string
  processInstanceKey: string
  bpmnProcessId?: string
  state: string
  assignee?: string
  candidateGroups?: string[]
  priority?: number
  dueDate?: string
  followUpDate?: string
  createdAt?: string
  caseId?: string
  businessKey?: string
}

export interface OperateUserTaskPage {
  items: OperateUserTaskRow[]
  nextCursor?: string
  source: string
}

export interface OperateUserTaskQuery {
  state?: string
  assignee?: string
  candidateGroup?: string
  bpmnProcessId?: string
  processInstanceKey?: string
  elementId?: string
  pageSize?: number
  cursor?: string
}

export interface OperateSummaryCount {
  label: string
  count: number
}

export interface OperateSummary {
  activeInstances: number
  openIncidents: number
  failedJobs: number
  truncated: boolean
  incidentsByType: OperateSummaryCount[]
  failedJobsByType: OperateSummaryCount[]
  instancesByProcess: OperateSummaryCount[]
}

export type ProcessDefinitionUploadPayload = {
  processCode?: string
  name: string
  status: string
  file: File
}

// ─── API helpers ─────────────────────────────────────────────────────────────────

/** Shared list query params supported by workflow catalog list endpoints. */
export interface WorkflowListParams {
  q?: string
  sort?: string
  order?: "asc" | "desc"
}

function listParamsToQuery(params?: WorkflowListParams) {
  if (!params) return ""
  const search = new URLSearchParams()
  if (params.q) search.set("q", params.q)
  if (params.sort) search.set("sort", params.sort)
  if (params.order) search.set("order", params.order)
  const raw = search.toString()
  return raw ? `?${raw}` : ""
}

function operateQuery(
  params?:
    | OperateInstanceQuery
    | OperateIncidentQuery
    | OperateJobQuery
    | OperateUserTaskQuery
) {
  if (!params) return ""
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue
    search.set(key, String(value))
  }
  const raw = search.toString()
  return raw ? `?${raw}` : ""
}

async function request<T>(
  path: string,
  options?: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown }
) {
  const method = options?.method ?? "GET"
  switch (method) {
    case "GET":
      return api.get<ApiSuccess<T>>(path).then((response) => response.result)
    case "POST":
      return api
        .post<ApiSuccess<T>>(path, options?.body)
        .then((response) => response.result)
    case "PUT":
      return api
        .put<ApiSuccess<T>>(path, options?.body)
        .then((response) => response.result)
    case "DELETE":
      return api.delete<ApiSuccess<T>>(path).then((response) => response.result)
  }
}

async function requestList<T>(
  path: string,
  options?: { method?: "GET"; body?: unknown }
): Promise<T[]> {
  const result = await request<{ items: T[] }>(path, options)
  return result.items
}

async function requestText(path: string) {
  return api.getText(path)
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

  return method === "POST"
    ? request<WorkflowProcessDefinition>(path, { method, body })
    : request<WorkflowProcessDefinition>(path, { method, body })
}

// ─── API methods ─────────────────────────────────────────────────────────────────

export const workflowApi = {
  async listCaseTypes(params?: WorkflowListParams) {
    return requestList<WorkflowCaseType>(
      `/api/workflow/case-types${listParamsToQuery(params)}`
    )
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
  async listSlaPolicies(params?: WorkflowListParams) {
    return requestList<SlaPolicy>(
      `/api/workflow/sla-policies${listParamsToQuery(params)}`
    )
  },
  async listDescriptionTemplates(params?: WorkflowListParams) {
    return requestList<DescriptionTemplate>(
      `/api/workflow/description-templates${listParamsToQuery(params)}`
    )
  },
  async listProcessRoles() {
    return requestList<ProcessRole>("/api/workflow/roles")
  },
  async listRoleCatalog() {
    return requestList<WorkflowRoleCatalog>("/api/workflow/role-catalog")
  },
  async listRoleMemberships(tenantId: string) {
    return requestList<WorkflowRoleMembership>(
      `/api/workflow/role-memberships?tenant_id=${encodeURIComponent(tenantId)}`
    )
  },
  async listAssignmentRules() {
    return requestList<WorkflowAssignmentRule>("/api/workflow/assignment-rules")
  },
  async listDelegations(tenantId: string) {
    return requestList<WorkflowDelegation>(
      `/api/workflow/delegations?tenant_id=${encodeURIComponent(tenantId)}`
    )
  },
  async listProcessDefinitions() {
    return requestList<WorkflowProcessDefinition>(
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
  },  searchOperateInstances(params?: OperateInstanceQuery) {
    return request<OperateInstancePage>(
      `/api/workflow/operate/process-instances${operateQuery(params)}`
    )
  },
  getOperateInstanceDetail(key: string) {
    return request<OperateInstanceDetail>(
      `/api/workflow/operate/process-instances/${encodeURIComponent(key)}`
    )
  },
  listInstanceElementInstances(key: string) {
    return request<OperateElementInstance[]>(
      `/api/workflow/operate/process-instances/${encodeURIComponent(key)}/element-instances`
    )
  },
  listInstanceVariables(key: string) {
    return request<OperateVariable[]>(
      `/api/workflow/operate/process-instances/${encodeURIComponent(key)}/variables`
    )
  },
  listInstanceJobs(key: string) {
    return request<OperateJob[]>(
      `/api/workflow/operate/process-instances/${encodeURIComponent(key)}/jobs`
    )
  },
  searchOperateIncidents(params?: OperateIncidentQuery) {
    return request<OperateIncidentPage>(
      `/api/workflow/operate/incidents${operateQuery(params)}`
    )
  },
  listInstanceHistory(key: string, cursor?: string) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}&limit=50` : "?limit=50"
    return request<OperateHistoryPage>(
      `/api/workflow/operate/process-instances/${encodeURIComponent(key)}/history${query}`
    )
  },
  searchOperateJobs(params?: OperateJobQuery) {
    return request<OperateJobPage>(
      `/api/workflow/operate/jobs${operateQuery(params)}`
    )
  },
  getOperateSummary() {
    return request<OperateSummary>("/api/workflow/operate/summary")
  },
  searchOperateUserTasks(params?: OperateUserTaskQuery) {
    return request<OperateUserTaskPage>(
      `/api/workflow/operate/user-tasks${operateQuery(params)}`
    )
  },
  assignUserTask(key: string, assignee?: string) {
    return request<{ status: string; assignee: string }>(
      `/api/workflow/operate/user-tasks/${encodeURIComponent(key)}/assign`,
      { method: "POST", body: assignee ? { assignee } : {} }
    )
  },
  getCaseTimeline(caseId: string) {
    return request<WorkflowTimelineEvent[]>(
      `/api/workflow/cases/${encodeURIComponent(caseId)}/timeline`
    )
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
  createRoleMembership(
    tenantId: string,
    payload: Omit<WorkflowRoleMembership, "id">
  ) {
    return request<WorkflowRoleMembership>(
      `/api/workflow/role-memberships?tenant_id=${encodeURIComponent(tenantId)}`,
      { method: "POST", body: payload }
    )
  },
  updateRoleMembership(
    tenantId: string,
    id: string,
    payload: Omit<WorkflowRoleMembership, "id">
  ) {
    return request<WorkflowRoleMembership>(
      `/api/workflow/role-memberships/${encodeURIComponent(id)}?tenant_id=${encodeURIComponent(tenantId)}`,
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
  createDelegation(tenantId: string, payload: Omit<WorkflowDelegation, "id">) {
    return request<WorkflowDelegation>(
      `/api/workflow/delegations?tenant_id=${encodeURIComponent(tenantId)}`,
      {
      method: "POST",
      body: payload,
      }
    )
  },
  updateDelegation(
    tenantId: string,
    id: string,
    payload: Omit<WorkflowDelegation, "id">
  ) {
    return request<WorkflowDelegation>(
      `/api/workflow/delegations/${encodeURIComponent(id)}?tenant_id=${encodeURIComponent(tenantId)}`,
      { method: "PUT", body: payload }
    )
  },
}

/** Workflow analytics summary (W6 dashboard). */
export interface WorkflowAnalytics {
  cases_total: number
  by_status: Record<string, number>
  by_case_type: Record<string, number>
  open_tasks: number
  overdue_tasks: number
}

export function getWorkflowAnalytics(params: { from?: string; to?: string } = {}) {
  const search = new URLSearchParams()
  if (params.from) search.set("from", params.from)
  if (params.to) search.set("to", params.to)
  const qs = search.toString()
  return request<WorkflowAnalytics>(`/api/workflow/analytics/overview${qs ? `?${qs}` : ""}`)
}

export function workItemsExportUrl(params: { direction?: string } = {}) {
  const search = new URLSearchParams()
  if (params.direction) search.set("direction", params.direction)
  const qs = search.toString()
  return `/api/workflow/work-items/export${qs ? `?${qs}` : ""}`
}
