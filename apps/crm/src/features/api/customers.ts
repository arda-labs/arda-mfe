import type {
  CustomerAmendment,
  AmendmentUpsertPayload,
  Customer,
  CustomerPayload,
  CustomerRelationship,
  CustomerRelationshipPayload,
  CustomerListParams,
  WorkflowTask,
  WorkflowWorkItem,
  WorkflowCase,
  WorkflowTimelineEvent,
} from "./types"
import { buildListSearchParams } from "@workspace/api/list"
import {
  getCanonical,
  getCanonicalList,
  postCanonical,
  putCanonical,
} from "@workspace/api"

export const customerApi = {
  /** Canonical list envelope (page/per_page/total) — consumed by server lists. */
  list(params: CustomerListParams = {}) {
    const search = buildListSearchParams({
      page: params.page,
      perPage: params.perPage,
      q: params.q,
      customer_type: params.customerType,
      status: params.status,
      risk_only: params.riskOnly,
    })
    return getCanonicalList<Customer>(`/api/crm/customers?${search.toString()}`)
  },
  get(id: string) {
    return getCanonical<Customer>(
      `/api/crm/customers/${encodeURIComponent(id)}`
    )
  },
  save(payload: CustomerPayload) {
    if (payload.id) {
      return putCanonical<Customer>(
        `/api/crm/customers/${encodeURIComponent(payload.id)}`,
        payload
      )
    }
    return postCanonical<Customer>("/api/crm/customers", payload)
  },
  submit(id: string) {
    return postCanonical<Customer>(
      `/api/crm/customers/${encodeURIComponent(id)}/submit`
    )
  },
  cancel(id: string) {
    return postCanonical<Customer>(
      `/api/crm/customers/${encodeURIComponent(id)}/cancel`
    )
  },
  listRelationships(customerId: string) {
    return getCanonicalList<CustomerRelationship>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/relationships`
    ).then((res) => res.items)
  },
  createRelationship(customerId: string, payload: CustomerRelationshipPayload) {
    return postCanonical<CustomerRelationship>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/relationships`,
      payload
    )
  },
  getWorkflowWorkItem(id: string) {
    return getCanonical<WorkflowWorkItem>(
      `/api/workflow/work-items/${encodeURIComponent(id)}`
    )
  },
  getWorkflowCase(id: string) {
    return getCanonical<WorkflowCase>(
      `/api/workflow/cases/${encodeURIComponent(id)}`
    )
  },
  claimWorkflowTask(input: {
    role?: string
    taskType?: string
    processInstanceKey?: string | number
    caseId?: string | null
    elementId?: string | null
  }) {
    return postCanonical<WorkflowTask>("/api/workflow/tasks/claim", input)
  },
  getTaskReadiness(caseId: string, stepCode: string) {
    return getCanonical<{ ready: boolean; status: string }>(
      `/api/workflow/cases/${encodeURIComponent(caseId)}/task-readiness?stepCode=${encodeURIComponent(stepCode)}`
    )
  },
  getWorkflowCaseTimeline(id: string) {
    return getCanonical<WorkflowTimelineEvent[]>(
      `/api/workflow/cases/${encodeURIComponent(id)}/timeline`
    )
  },
  completeTask(input: {
    jobKey: string
    processInstanceKey: string
    elementId: string
    variables: Record<string, unknown>
  }) {
    return postCanonical<{ status: string }>(
      `/api/workflow/tasks/${encodeURIComponent(input.jobKey)}/complete`,
      {
        processInstanceKey: input.processInstanceKey,
        elementId: input.elementId,
        variables: input.variables,
      }
    )
  },
  getCurrentAmendment(customerId: string) {
    return getCanonical<CustomerAmendment | null>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/adjustments`
    )
  },
  startAdjustment(customerId: string) {
    return postCanonical<CustomerAmendment>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/adjustments`
    )
  },
  updateAmendment(
    customerId: string,
    amendmentId: string,
    payload: AmendmentUpsertPayload
  ) {
    return putCanonical<CustomerAmendment>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/adjustments/${encodeURIComponent(amendmentId)}`,
      payload
    )
  },
  submitAmendment(customerId: string, amendmentId: string) {
    return postCanonical<CustomerAmendment>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/adjustments/${encodeURIComponent(amendmentId)}/submit`
    )
  },
  cancelAmendment(customerId: string, amendmentId: string) {
    return postCanonical<{ status: string }>(
      `/api/crm/customers/${encodeURIComponent(customerId)}/adjustments/${encodeURIComponent(amendmentId)}/cancel`
    )
  },
}
