export type WorkbenchDirection = "incoming" | "outgoing"
export type WorkbenchSearchDirection = "ALL" | "INCOMING" | "OUTGOING"

export interface WorkflowCase {
  id: string
  tenantId: string
  caseType: string
  caseCode: string
  title: string
  primaryObjectType: string
  primaryObjectId: string
  domainService: string
  status: string
  currentStep: string
  priority: string
  createdBy: string
  assignedTo?: string
  candidateRole?: string
  slaDueAt?: string
  processInstanceKey?: number
  bpmnProcessId?: string
  bpmnVersion?: number
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface WorkflowTask {
  jobKey?: number
  type: string
  elementId: string
  processInstanceKey?: number
  caseId: string
  caseCode: string
  customerId: string
  customerName: string
  candidateRole: string
  formKey: string
  slaDueAt?: string
  variables: Record<string, unknown>
}

export interface WorkflowCaseSearchParams {
  keyword: string
  direction: WorkbenchSearchDirection
  status: string
}

export interface WorkflowTaskRequest {
  taskType: string
  role: string
}

export interface WorkItem {
  id: string
  tenantId?: string
  caseId: string
  caseCode: string
  caseType: string
  title: string
  description?: string
  summary?: string
  status: string
  transactionStatus?: string
  priority?: string
  direction?: WorkbenchSearchDirection
  currentStep?: string
  stepCode: string
  stepName?: string
  taskType?: string
  formKey?: string
  primaryObjectType?: string
  primaryObjectId?: string
  domainService?: string
  assignedTo?: string
  assignedToName?: string
  assignedToAvatar?: string
  previousAssignedTo?: string
  previousAssignedToName?: string
  previousAssignedToAvatar?: string
  assignedAt?: string
  claimExpiresAt?: string
  candidateRole?: string
  candidateGroupId?: string
  candidateOrgUnitId?: string
  createdBy?: string
  createdByName?: string
  createdByAvatar?: string
  claimable?: boolean
  canClaim?: boolean
  canOpen?: boolean
  canReassign?: boolean
  claimBlockedReason?: string
  jobKey?: string
  processInstanceKey?: string
  bpmnProcessId?: string
  bpmnVersion?: number
  slaDueAt?: string
  slaStatus?: "NONE" | "MET" | "WARNING" | "BREACHED"
  createdAt?: string
  updatedAt: string
  completedAt?: string
  variables?: Record<string, unknown>
}

export interface WorkItemFilter {
  keyword?: string
  direction?: WorkbenchSearchDirection
  fromDate?: string
  toDate?: string
  accounting?: "ALL" | "POSTED" | "NOT_POSTED"
  slaStatus?: "ALL" | "MET" | "BREACHED"
  transactionStatus?: string
  node?: string
  status?: string
  caseType?: string
  candidateRole?: string
  assignedTo?: string
  scope?: "POOL" | "MINE"
  priority?: string
  dueBefore?: string
  limit?: number
  offset?: number
}

export interface WorkItemSummaryNode {
  id: string
  label: string
  count: number
  overdue?: number
  status?: string
  caseType?: string
  direction?: WorkbenchSearchDirection
  children?: WorkItemSummaryNode[]
}

export interface ClaimWorkItemRequest {
  workItemId: string
  assignee?: string
  role?: string
}

export interface ClaimWorkItemResponse {
  workItem: WorkItem
  claimedBy?: string
  claimedAt?: string
}

const caseTypesByDirection: Record<WorkbenchDirection, string[]> = {
  incoming: [
    "CUSTOMER_REGISTRATION",
    "CUSTOMER_ADJUSTMENT",
    "FINANCE_INCOMING_TRANSACTION",
    "HRM_EMPLOYEE_REGISTRATION",
  ],
  outgoing: [
    "CUSTOMER_REGISTRATION",
    "CUSTOMER_ADJUSTMENT",
    "FINANCE_OUTGOING_TRANSACTION",
    "HRM_EMPLOYEE_REGISTRATION",
  ],
}

export const taskTypesByDirection: Record<
  WorkbenchDirection,
  WorkflowTaskRequest[]
> = {
  incoming: [
    {
      taskType: "workflow.customer_checker_review",
      role: "CUSTOMER_CHECKER",
    },
    {
      taskType: "workflow.customer_risk_review",
      role: "CUSTOMER_RISK_CHECKER",
    },
    {
      taskType: "workflow.customer_maker_revise",
      role: "CUSTOMER_MAKER",
    },
    {
      taskType: "workflow.finance_incoming_classify",
      role: "FINANCE_TXN_MAKER",
    },
    {
      taskType: "workflow.finance_incoming_approve",
      role: "FINANCE_TXN_CHECKER",
    },
    {
      taskType: "workflow.hrm_registration_review",
      role: "HRM_REGISTRATION_REVIEWER",
    },
    {
      taskType: "workflow.hrm_registration_approve",
      role: "HRM_REGISTRATION_APPROVER",
    },
  ],
  outgoing: [
    {
      taskType: "workflow.finance_outgoing_verify",
      role: "FINANCE_TXN_MAKER",
    },
    {
      taskType: "workflow.finance_outgoing_approve",
      role: "FINANCE_TXN_CHECKER",
    },
  ],
}

export const workbenchApi = {
  listWorkItems(filter: WorkItemFilter = {}) {
    const search = toWorkItemSearch(filter)
    const suffix = search ? `?${search}` : ""
    return getItems<WorkItem>(`/api/workflow/work-items${suffix}`)
  },

  listWorkItemSummary(filter: WorkItemFilter = {}) {
    const search = toWorkItemSearch(filter)
    const suffix = search ? `?${search}` : ""
    return getItems<WorkItemSummaryNode>(
      `/api/workflow/work-items/summary${suffix}`,
      "nodes"
    )
  },

  claimWorkItem(input: ClaimWorkItemRequest) {
    const { workItemId, ...body } = input
    return request<ClaimWorkItemResponse>(
      `/api/workflow/work-items/${encodeURIComponent(workItemId)}/claim`,
      {
        method: "POST",
        body: Object.keys(body).length ? body : undefined,
      }
    )
  },

  async listCasesByDirection(direction: WorkbenchDirection) {
    const groups = await Promise.all(
      caseTypesByDirection[direction].map((caseType) =>
        listWorkflowCases({ caseType, limit: 100 })
      )
    )
    return sortCases(groups.flat())
  },

  async searchCases(params: WorkflowCaseSearchParams) {
    const caseTypes =
      params.direction === "ALL"
        ? [...caseTypesByDirection.incoming, ...caseTypesByDirection.outgoing]
        : caseTypesByDirection[
            params.direction === "INCOMING" ? "incoming" : "outgoing"
          ]
    const groups = await Promise.all(
      caseTypes.map((caseType) =>
        listWorkflowCases({
          caseType,
          keyword: params.keyword,
          status: params.status === "ALL" ? "" : params.status,
          limit: 100,
        })
      )
    )
    return sortCases(groups.flat())
  },

  async activateTasks(input: WorkflowTaskRequest) {
    const search = new URLSearchParams({
      task_type: input.taskType,
      role: input.role,
      limit: "10",
    })
    const data = await request<WorkflowTask[] | { items?: WorkflowTask[] }>(
      `/api/workflow/tasks?${search.toString()}`
    )
    return Array.isArray(data) ? data : (data.items ?? [])
  },

  claimTask(input: WorkflowTaskRequest) {
    return request<WorkflowTask>("/api/workflow/tasks/claim", {
      method: "POST",
      body: input,
    })
  },

  completeTask(input: {
    jobKey: string
    processInstanceKey: string
    elementId: string
    variables: Record<string, unknown>
  }) {
    return request<{ status: string }>(
      `/api/workflow/tasks/${encodeURIComponent(String(input.jobKey))}/complete`,
      {
        method: "POST",
        body: {
          processInstanceKey: input.processInstanceKey,
          elementId: input.elementId,
          variables: input.variables,
        },
      }
    )
  },
}

async function listWorkflowCases(params: {
  caseType: string
  status?: string
  keyword?: string
  limit?: number
}) {
  const search = new URLSearchParams()
  search.set("case_type", params.caseType)
  search.set("limit", String(params.limit ?? 100))
  if (params.status) search.set("status", params.status)
  if (params.keyword) search.set("keyword", params.keyword)
  return request<WorkflowCase[]>(`/api/workflow/cases?${search.toString()}`)
}

async function getItems<T>(path: string, key = "items") {
  const data = await request<T[] | Record<string, T[] | undefined>>(path)
  if (Array.isArray(data)) return data
  return data[key] ?? data.items ?? data.data ?? []
}

function toWorkItemSearch(filter: WorkItemFilter) {
  const search = new URLSearchParams()
  setSearch(search, "keyword", filter.keyword)
  // Keep direction=ALL — omitting it makes the API default to INCOMING
  // and permission-filter the list, so search looks empty.
  setSearch(search, "direction", filter.direction)
  setSearch(search, "fromDate", filter.fromDate)
  setSearch(search, "toDate", filter.toDate)
  setSearch(
    search,
    "accounting",
    filter.accounting === "ALL" ? undefined : filter.accounting
  )
  setSearch(
    search,
    "slaStatus",
    filter.slaStatus === "ALL" ? undefined : filter.slaStatus
  )
  setSearch(
    search,
    "transactionStatus",
    filter.transactionStatus === "ALL" ? undefined : filter.transactionStatus
  )
  setSearch(search, "node", filter.node === "ALL" ? undefined : filter.node)
  setSearch(
    search,
    "status",
    filter.status === "ALL" ? undefined : filter.status
  )
  setSearch(search, "case_type", filter.caseType)
  setSearch(search, "candidate_role", filter.candidateRole)
  setSearch(search, "assigned_to", filter.assignedTo)
  setSearch(search, "scope", filter.scope)
  setSearch(search, "priority", filter.priority)
  setSearch(search, "due_before", filter.dueBefore)
  setSearch(search, "limit", filter.limit)
  setSearch(search, "offset", filter.offset)
  return search.toString()
}

function setSearch(
  search: URLSearchParams,
  key: string,
  value: string | number | undefined
) {
  if (value !== undefined && value !== "") search.set(key, String(value))
}

async function request<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {}
) {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "include",
    headers:
      options.body === undefined
        ? undefined
        : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  if (!response.ok) {
    const message = await response.text().catch(() => "")
    throw new Error(message || `Request failed with status ${response.status}`)
  }
  return (await response.json()) as T
}

function sortCases(items: Array<WorkflowCase | null | undefined>) {
  return items
    .filter(isWorkflowCase)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}

function isWorkflowCase(
  item: WorkflowCase | null | undefined
): item is WorkflowCase {
  return Boolean(item?.id && item.caseCode)
}
