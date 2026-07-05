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

export interface ProcessMetric {
  label: string
  value: string
  tone: "default" | "success" | "warning" | "error"
}

const mockCaseTypes: WorkflowCaseType[] = [
  {
    caseType: "FINANCE_INCOMING_TRANSACTION",
    businessArea: "Kế toán",
    operationName: "Giao dịch đến",
    bpmnProcessId: "finance-incoming-transaction-v1",
    bpmnVersion: 1,
    workflowEnabled: true,
    defaultSlaPolicyId: "SLA_FIN_IN_8H",
    makerRole: "FINANCE_TXN_MAKER",
    checkerRole: "FINANCE_TXN_CHECKER",
    ownerService: "finance-service",
    status: "ACTIVE",
    effectiveFrom: "2026-07-02T00:00:00+07:00",
  },
  {
    caseType: "FINANCE_OUTGOING_TRANSACTION",
    businessArea: "Kế toán",
    operationName: "Giao dịch đi",
    bpmnProcessId: "finance-outgoing-transaction-v1",
    bpmnVersion: 1,
    workflowEnabled: true,
    defaultSlaPolicyId: "SLA_FIN_OUT_8H",
    makerRole: "FINANCE_TXN_MAKER",
    checkerRole: "FINANCE_TXN_CHECKER",
    ownerService: "finance-service",
    status: "ACTIVE",
    effectiveFrom: "2026-07-02T00:00:00+07:00",
  },
  {
    caseType: "CUSTOMER_REGISTRATION",
    businessArea: "Khách hàng hội viên",
    operationName: "Đăng ký khách hàng",
    bpmnProcessId: "customer-registration-v1",
    bpmnVersion: 1,
    workflowEnabled: true,
    defaultSlaPolicyId: "SLA_CUSTOMER_REG_24H",
    makerRole: "CUSTOMER_MAKER",
    checkerRole: "CUSTOMER_CHECKER",
    ownerService: "crm-service",
    status: "DRAFT",
    effectiveFrom: "2026-07-02T00:00:00+07:00",
  },
]

const mockCases: WorkflowCase[] = [
  {
    id: "case-fin-in-001",
    caseType: "FINANCE_INCOMING_TRANSACTION",
    caseCode: "FIN-IN-20260702-001",
    title: "Thu tiền chuyển khoản khách hàng",
    status: "IN_REVIEW",
    currentStep: "Phân loại tài khoản",
    assignedTo: "ops.finance.01",
    candidateRole: "FINANCE_TXN_MAKER",
    slaDueAt: "2026-07-02T16:30:00+07:00",
    processInstanceKey: 2251799813685251,
    bpmnProcessId: "finance-incoming-transaction-v1",
    bpmnVersion: 1,
    updatedAt: "2026-07-02T11:25:00+07:00",
  },
  {
    id: "case-fin-out-001",
    caseType: "FINANCE_OUTGOING_TRANSACTION",
    caseCode: "FIN-OUT-20260702-004",
    title: "Chi hoàn tiền khách hàng",
    status: "SUBMITTED",
    currentStep: "Kiểm tra người nhận",
    candidateRole: "FINANCE_TXN_MAKER",
    slaDueAt: "2026-07-03T09:00:00+07:00",
    bpmnProcessId: "finance-outgoing-transaction-v1",
    bpmnVersion: 1,
    updatedAt: "2026-07-02T10:40:00+07:00",
  },
]

const mockSlaPolicies: SlaPolicy[] = [
  {
    id: "SLA_FIN_IN_8H",
    code: "SLA_FIN_IN_8H",
    name: "Giao dịch đến trong ngày",
    caseType: "FINANCE_INCOMING_TRANSACTION",
    dueInHours: 8,
    warningInHours: 2,
    escalationRole: "FINANCE_OPS_SUPERVISOR",
    status: "ACTIVE",
    effectiveFrom: "2026-07-02T00:00:00+07:00",
    taskPolicies: [
      {
        id: "SLA_TASK_FIN_IN_CLASSIFY",
        stepCode: "classify-account",
        taskName: "Phân loại tài khoản",
        durationValue: 2,
        durationUnit: "HOUR",
        warningMode: "ABSOLUTE",
        warningValue: 30,
        warningUnit: "MINUTE",
        escalationRole: "FINANCE_OPS_SUPERVISOR",
        sortOrder: 10,
        status: "ACTIVE",
      },
      {
        id: "SLA_TASK_FIN_IN_APPROVE",
        stepCode: "approve-journal",
        taskName: "Duyệt bút toán",
        durationValue: 4,
        durationUnit: "HOUR",
        warningMode: "PERCENT",
        warningValue: 75,
        warningUnit: "PERCENT",
        escalationRole: "FINANCE_OPS_SUPERVISOR",
        sortOrder: 20,
        status: "ACTIVE",
      },
    ],
  },
  {
    id: "SLA_CUSTOMER_REG_24H",
    code: "SLA_CUSTOMER_REG_24H",
    name: "Đăng ký khách hàng 24h",
    caseType: "CUSTOMER_REGISTRATION",
    dueInHours: 24,
    warningInHours: 4,
    escalationRole: "CUSTOMER_SUPERVISOR",
    status: "DRAFT",
    effectiveFrom: "2026-07-02T00:00:00+07:00",
    taskPolicies: [
      {
        id: "SLA_TASK_CUSTOMER_REG_REVIEW",
        stepCode: "review-registration",
        taskName: "Rà soát đăng ký",
        durationValue: 8,
        durationUnit: "HOUR",
        warningMode: "PERCENT",
        warningValue: 80,
        warningUnit: "PERCENT",
        escalationRole: "CUSTOMER_SUPERVISOR",
        sortOrder: 10,
        status: "DRAFT",
      },
    ],
  },
]

const mockDescriptionTemplates: DescriptionTemplate[] = [
  {
    id: "DESC_FIN_IN",
    code: "DESC_FIN_IN",
    businessSubsystem: "FAC",
    caseType: "FINANCE_INCOMING_TRANSACTION",
    pattern: "{caseCode} - {counterpartyName} - {amount} {currency}",
    preview: "FIN-IN-20260702-001 - Công ty Minh An - 125.000.000 VND",
    status: "ACTIVE",
  },
  {
    id: "DESC_CUSTOMER_REG",
    code: "DESC_CUSTOMER_REG",
    businessSubsystem: "CRM",
    caseType: "CUSTOMER_REGISTRATION",
    pattern: "{caseCode} - {customerName} - {identityNo}",
    preview: "CUS-REG-20260702-009 - Nguyễn Hoàng Nam - 012345678901",
    status: "DRAFT",
  },
]

const mockProcessRoles: ProcessRole[] = [
  {
    id: "ROLE_FIN_IN_MAKER",
    caseType: "FINANCE_INCOMING_TRANSACTION",
    stepCode: "classify-account",
    businessRole: "Người xử lý giao dịch đến",
    iamRole: "FINANCE_TXN_MAKER",
    actionScope: "claim, save, submit",
    status: "ACTIVE",
  },
  {
    id: "ROLE_FIN_IN_CHECKER",
    caseType: "FINANCE_INCOMING_TRANSACTION",
    stepCode: "approve-journal",
    businessRole: "Người duyệt bút toán",
    iamRole: "FINANCE_TXN_CHECKER",
    actionScope: "approve, reject, suspend",
    status: "ACTIVE",
  },
]

const mockRoleCatalog: WorkflowRoleCatalog[] = [
  {
    roleCode: "FINANCE_TXN_MAKER",
    roleName: "Người lập giao dịch kế toán",
    roleType: "MAKER",
    businessSubsystem: "FAC",
    status: "ACTIVE",
  },
  {
    roleCode: "FINANCE_TXN_CHECKER",
    roleName: "Người duyệt giao dịch kế toán",
    roleType: "CHECKER",
    businessSubsystem: "FAC",
    status: "ACTIVE",
  },
  {
    roleCode: "FINANCE_OPS_SUPERVISOR",
    roleName: "Giám sát vận hành kế toán",
    roleType: "SUPERVISOR",
    businessSubsystem: "FAC",
    status: "ACTIVE",
  },
]

const mockRoleMemberships: WorkflowRoleMembership[] = [
  {
    id: "MEM_FIN_MAKER_01",
    roleCode: "FINANCE_TXN_MAKER",
    principalType: "USER",
    principalId: "ops.finance.01",
    tenantId: "tenant-1",
    orgId: "HO",
    branchId: "",
    productCode: "",
    minAmount: 0,
    maxAmount: 500000000,
    effectiveFrom: "2026-07-02T00:00:00+07:00",
    status: "ACTIVE",
  },
]

const mockAssignmentRules: WorkflowAssignmentRule[] = [
  {
    id: "ASSIGN_FIN_IN_APPROVE",
    caseType: "FINANCE_INCOMING_TRANSACTION",
    stepCode: "approve-journal",
    roleCode: "FINANCE_TXN_CHECKER",
    assignmentMode: "CANDIDATE_POOL",
    requireSeparationOfDuties: true,
    fallbackRoleCode: "FINANCE_OPS_SUPERVISOR",
    priority: 20,
    status: "ACTIVE",
  },
]

const mockDelegations: WorkflowDelegation[] = [
  {
    id: "DEL_FIN_SUP_01",
    fromPrincipalId: "ops.finance.01",
    toPrincipalId: "ops.finance.02",
    roleCode: "FINANCE_TXN_MAKER",
    effectiveFrom: "2026-07-02T00:00:00+07:00",
    effectiveTo: "2026-07-09T00:00:00+07:00",
    reason: "Nghỉ phép",
    status: "ACTIVE",
  },
]

const mockProcessXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_Finance_In" targetNamespace="http://arda.local/bpmn">
  <bpmn:process id="finance-incoming-transaction-v1" name="Finance Incoming Transaction" isExecutable="true">
    <bpmn:startEvent id="StartEvent_Submit" name="Submit"><bpmn:outgoing>Flow_Submit_Classify</bpmn:outgoing></bpmn:startEvent>
    <bpmn:sequenceFlow id="Flow_Submit_Classify" sourceRef="StartEvent_Submit" targetRef="classify-account" />
    <bpmn:userTask id="classify-account" name="Phan loai tai khoan"><bpmn:incoming>Flow_Submit_Classify</bpmn:incoming><bpmn:outgoing>Flow_Classify_Approve</bpmn:outgoing></bpmn:userTask>
    <bpmn:sequenceFlow id="Flow_Classify_Approve" sourceRef="classify-account" targetRef="approve-journal" />
    <bpmn:userTask id="approve-journal" name="Duyet but toan"><bpmn:incoming>Flow_Classify_Approve</bpmn:incoming><bpmn:outgoing>Flow_Approve_End</bpmn:outgoing></bpmn:userTask>
    <bpmn:sequenceFlow id="Flow_Approve_End" sourceRef="approve-journal" targetRef="EndEvent_Done" />
    <bpmn:endEvent id="EndEvent_Done" name="Done"><bpmn:incoming>Flow_Approve_End</bpmn:incoming></bpmn:endEvent>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_Finance_In">
    <bpmndi:BPMNPlane id="BPMNPlane_Finance_In" bpmnElement="finance-incoming-transaction-v1">
      <bpmndi:BPMNShape id="StartEvent_Submit_di" bpmnElement="StartEvent_Submit"><dc:Bounds x="150" y="110" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="classify-account_di" bpmnElement="classify-account"><dc:Bounds x="250" y="88" width="150" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="approve-journal_di" bpmnElement="approve-journal"><dc:Bounds x="470" y="88" width="150" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_Done_di" bpmnElement="EndEvent_Done"><dc:Bounds x="700" y="110" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_Submit_Classify_di" bpmnElement="Flow_Submit_Classify"><di:waypoint x="186" y="128" /><di:waypoint x="250" y="128" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Classify_Approve_di" bpmnElement="Flow_Classify_Approve"><di:waypoint x="400" y="128" /><di:waypoint x="470" y="128" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Approve_End_di" bpmnElement="Flow_Approve_End"><di:waypoint x="620" y="128" /><di:waypoint x="700" y="128" /></bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

const mockProcessDefinitions: WorkflowProcessDefinition[] = [
  {
    id: "PROC_DEF_FIN_IN",
    processCode: "FIN_INCOMING_V1",
    name: "Giao dịch đến",
    bpmnProcessId: "finance-incoming-transaction-v1",
    version: 1,
    resourceName: "finance-incoming-transaction-v1.bpmn",
    xmlContent: mockProcessXml,
    deploymentKey: 2251799813685001,
    status: "ACTIVE",
    deployedAt: "2026-07-02T09:00:00+07:00",
  },
]

export const workflowApi = {
  async listCaseTypes() {
    return getArrayOrMock<WorkflowCaseType>(
      "/api/workflow/case-types",
      "caseTypes",
      mockCaseTypes
    )
  },
  async listCases() {
    return getArrayOrMock<WorkflowCase>(
      "/api/workflow/cases?limit=100",
      "cases",
      mockCases
    )
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
    return getArrayOrMock<SlaPolicy>(
      "/api/workflow/sla-policies",
      "slaPolicies",
      mockSlaPolicies
    )
  },
  async listDescriptionTemplates() {
    return getArrayOrMock<DescriptionTemplate>(
      "/api/workflow/description-templates",
      "descriptionTemplates",
      mockDescriptionTemplates
    )
  },
  async listProcessRoles() {
    return getArrayOrMock<ProcessRole>(
      "/api/workflow/roles",
      "processRoles",
      mockProcessRoles
    )
  },
  async listRoleCatalog() {
    return getArrayOrMock<WorkflowRoleCatalog>(
      "/api/workflow/role-catalog",
      "roleCatalog",
      mockRoleCatalog
    )
  },
  async listRoleMemberships() {
    return getArrayOrMock<WorkflowRoleMembership>(
      "/api/workflow/role-memberships",
      "roleMemberships",
      mockRoleMemberships
    )
  },
  async listAssignmentRules() {
    return getArrayOrMock<WorkflowAssignmentRule>(
      "/api/workflow/assignment-rules",
      "assignmentRules",
      mockAssignmentRules
    )
  },
  async listDelegations() {
    return getArrayOrMock<WorkflowDelegation>(
      "/api/workflow/delegations",
      "delegations",
      mockDelegations
    )
  },
  async listProcessDefinitions() {
    return getArrayOrMock<WorkflowProcessDefinition>(
      "/api/workflow/process-definitions",
      "processDefinitions",
      mockProcessDefinitions
    )
  },
  getProcessDefinitionXml(id: string) {
    return requestText(`/api/workflow/process-definitions/${encodeURIComponent(id)}/xml`)
  },
  importProcessDefinition(payload: ProcessDefinitionUploadPayload) {
    return uploadProcessDefinition("/api/workflow/process-definitions", "POST", payload)
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
    return request<void>(`/api/workflow/process-definitions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
  },
  createCaseType(payload: Omit<WorkflowCaseType, "effectiveFrom" | "effectiveTo">) {
    return request<WorkflowCaseType>("/api/workflow/case-types", {
      method: "POST",
      body: payload,
    })
  },
  updateCaseType(
    caseType: string,
    payload: Omit<WorkflowCaseType, "caseType" | "effectiveFrom" | "effectiveTo">
  ) {
    return request<WorkflowCaseType>(
      `/api/workflow/case-types/${encodeURIComponent(caseType)}`,
      {
        method: "PUT",
        body: payload,
      }
    )
  },
  updateProcessConfig(caseType: string, payload: Partial<WorkflowCaseType>) {
    return request<WorkflowCaseType>(
      `/api/workflow/case-types/${encodeURIComponent(caseType)}/process-config`,
      {
        method: "PUT",
        body: payload,
      }
    )
  },
  createSlaPolicy(payload: Omit<SlaPolicy, "id" | "createdAt" | "updatedAt">) {
    return request<SlaPolicy>("/api/workflow/sla-policies", {
      method: "POST",
      body: payload,
    })
  },
  updateSlaPolicy(id: string, payload: Omit<SlaPolicy, "id" | "createdAt" | "updatedAt">) {
    return request<SlaPolicy>(`/api/workflow/sla-policies/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: payload,
    })
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
      {
        method: "PUT",
        body: payload,
      }
    )
  },
  createProcessRole(payload: Omit<ProcessRole, "id" | "createdAt" | "updatedAt">) {
    return request<ProcessRole>("/api/workflow/roles", {
      method: "POST",
      body: payload,
    })
  },
  updateProcessRole(id: string, payload: Omit<ProcessRole, "id" | "createdAt" | "updatedAt">) {
    return request<ProcessRole>(`/api/workflow/roles/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: payload,
    })
  },
  createRoleCatalog(payload: WorkflowRoleCatalog) {
    return request<WorkflowRoleCatalog>("/api/workflow/role-catalog", {
      method: "POST",
      body: payload,
    })
  },
  updateRoleCatalog(roleCode: string, payload: WorkflowRoleCatalog) {
    return request<WorkflowRoleCatalog>(`/api/workflow/role-catalog/${encodeURIComponent(roleCode)}`, {
      method: "PUT",
      body: payload,
    })
  },
  createRoleMembership(payload: Omit<WorkflowRoleMembership, "id">) {
    return request<WorkflowRoleMembership>("/api/workflow/role-memberships", {
      method: "POST",
      body: payload,
    })
  },
  updateRoleMembership(id: string, payload: Omit<WorkflowRoleMembership, "id">) {
    return request<WorkflowRoleMembership>(`/api/workflow/role-memberships/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: payload,
    })
  },
  createAssignmentRule(payload: Omit<WorkflowAssignmentRule, "id">) {
    return request<WorkflowAssignmentRule>("/api/workflow/assignment-rules", {
      method: "POST",
      body: payload,
    })
  },
  updateAssignmentRule(id: string, payload: Omit<WorkflowAssignmentRule, "id">) {
    return request<WorkflowAssignmentRule>(`/api/workflow/assignment-rules/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: payload,
    })
  },
  createDelegation(payload: Omit<WorkflowDelegation, "id">) {
    return request<WorkflowDelegation>("/api/workflow/delegations", {
      method: "POST",
      body: payload,
    })
  },
  updateDelegation(id: string, payload: Omit<WorkflowDelegation, "id">) {
    return request<WorkflowDelegation>(`/api/workflow/delegations/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: payload,
    })
  },
}

export type ProcessDefinitionUploadPayload = {
  processCode?: string
  name: string
  status: string
  file: File
}

async function getArrayOrMock<T>(
  path: string,
  key: string,
  fallback: T[]
): Promise<{ data: T[]; source: "api" | "mock" }> {
  const response = await fetch(path, { credentials: "include" })
  if (response.status === 404) return { data: fallback, source: "mock" }
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
  const data = (await response.json()) as T[] | Record<string, T[] | undefined>
  if (Array.isArray(data)) return { data, source: "api" }
  return { data: data[key] ?? data.items ?? [], source: "api" }
}

async function request<T>(
  path: string,
  options?: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown }
) {
  const method = options?.method ?? "GET"
  const response = await fetch(path, {
    method,
    credentials: "include",
    headers: options?.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  })
  if (!response.ok) {
    const message = await response.text().catch(() => "")
    throw new Error(message || `Request failed with status ${response.status}`)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

async function requestText(path: string) {
  const response = await fetch(path, { credentials: "include" })
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

  const response = await fetch(path, {
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
