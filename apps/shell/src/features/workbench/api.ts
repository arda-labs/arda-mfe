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
  jobKey: number
  type: string
  elementId: string
  processInstanceKey: number
  caseId: string
  caseCode: string
  customerId: string
  customerName: string
  candidateRole: string
  formKey: string
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

const caseTypesByDirection: Record<WorkbenchDirection, string[]> = {
  incoming: ["FINANCE_INCOMING_TRANSACTION"],
  outgoing: ["FINANCE_OUTGOING_TRANSACTION"],
}

export const taskTypesByDirection: Record<
  WorkbenchDirection,
  WorkflowTaskRequest[]
> = {
  incoming: [
    {
      taskType: "workflow.finance_incoming_classify",
      role: "FINANCE_TXN_MAKER",
    },
    {
      taskType: "workflow.finance_incoming_approve",
      role: "FINANCE_TXN_CHECKER",
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

  completeTask(input: {
    jobKey: number
    processInstanceKey: number
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
  return items.filter(isWorkflowCase).sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
  )
}

function isWorkflowCase(item: WorkflowCase | null | undefined): item is WorkflowCase {
  return Boolean(item?.id && item.caseCode)
}
