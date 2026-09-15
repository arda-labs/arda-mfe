import type {
  WorkbenchDirection,
  WorkflowCase,
  WorkflowCaseSearchParams,
  WorkItem,
  WorkItemFilter,
  WorkItemSummaryNode,
  ClaimWorkItemRequest,
  ClaimWorkItemResponse,
} from "./types"
import { api, type ApiSuccess } from "@workspace/api"
import { buildSearchParams } from "@workspace/api/query"

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
  const search = buildSearchParams({
    case_type: params.caseType,
    limit: params.limit ?? 100,
    status: params.status,
    keyword: params.keyword,
  })
  return getItems<WorkflowCase>(`/api/workflow/cases?${search.toString()}`)
}

async function getItems<T>(path: string, key = "items"): Promise<T[]> {
  const result = await request<Record<string, T[]>>(path)
  const items = result[key]
  if (!items) throw new Error(`Workflow list response is missing ${key}`)
  return items
}

function toWorkItemSearch(filter: WorkItemFilter) {
  // Keep direction=ALL — omitting it makes the API default to INCOMING
  // and permission-filter the list, so search looks empty.
  const search = buildSearchParams({
    keyword: filter.keyword,
    direction: filter.direction,
    fromDate: filter.fromDate,
    toDate: filter.toDate,
    accounting: filter.accounting === "ALL" ? undefined : filter.accounting,
    slaStatus: filter.slaStatus === "ALL" ? undefined : filter.slaStatus,
    transactionStatus:
      filter.transactionStatus === "ALL" ? undefined : filter.transactionStatus,
    node: filter.node === "ALL" ? undefined : filter.node,
    domain: filter.domain === "ALL" ? undefined : filter.domain,
    status: filter.status === "ALL" ? undefined : filter.status,
    case_type: filter.caseType,
    candidate_role: filter.candidateRole,
    assigned_to: filter.assignedTo,
    priority: filter.priority,
    due_before: filter.dueBefore,
    limit: filter.limit,
    offset: filter.offset,
  })
  return search.toString()
}

async function request<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {}
) {
  return options.method === "POST"
    ? api
        .post<ApiSuccess<T>>(path, options.body)
        .then((response) => response.result)
    : api.get<ApiSuccess<T>>(path).then((response) => response.result)
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
