import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { notify } from "@workspace/ui/feedback/notify"
import { navigateTo } from "@workspace/ui/shell/routing"
import {
  claimWithRetry,
  isViewOnlyTaskContext,
  stringParam,
  useWorkItemContext,
  workflowKey,
} from "@workspace/workflow-task"
import {
  customerApi,
  type Customer,
  type WorkflowTaskRole,
  type WorkflowWorkItem,
} from "../../api"
import type { TFunction } from "../schemas"

// URL/deep-link helpers live in @workspace/workflow-task (shared with loan);
// re-exported so existing imports keep working.
export { isViewOnlyTaskContext, stringParam, workflowKey }

export type CustomerTaskContext = {
  customerId: string | null
  caseId: string | null
  caseCode: string | null
  taskKey: string | null
  processInstanceKey: string | null
  elementId: string | null
  role: WorkflowTaskRole
  /** Server task status (READY/CLAIMED/COMPLETED/…); null for URL-only contexts. */
  workItemStatus: string | null
}

const ACTIONABLE_WORK_ITEM_STATUSES = new Set(["READY", "CLAIMED"])

/**
 * A deep-linked work item exposes its real status, so a task that was already
 * completed/cancelled must render view-only even if the URL still carries a
 * maker role. URL-only contexts (no work item id) stay actionable: the screen
 * claims the live engine task on demand.
 */
export function isActionableWorkItem(context: CustomerTaskContext) {
  if (!context.workItemStatus) return true
  return ACTIONABLE_WORK_ITEM_STATUSES.has(context.workItemStatus)
}

export function effectiveBpmnElementId(
  role: WorkflowTaskRole,
  elementId: string | null,
  customerStatus?: Customer["status"]
) {
  if (role === "CUSTOMER_MAKER") {
    if (
      customerStatus === "NEEDS_CHANGES" ||
      elementId === "Activity_CheckerReview" ||
      elementId === "UT_CheckerReview" ||
      !elementId
    ) {
      return elementId === "UT_MakerRevise" ||
        elementId === "Activity_MakerRevise"
        ? elementId
        : "UT_MakerRevise"
    }
  }
  if (elementId === "Activity_CheckerReview") return "UT_CheckerReview"
  if (elementId === "Activity_MakerRevise") return "UT_MakerRevise"
  return elementId
}

export function syncTaskContextSearch(updates: {
  taskKey?: string
  elementId?: string
  role?: WorkflowTaskRole | string
}) {
  const params = new URLSearchParams(window.location.search)
  if (params.has("workItemId")) return
  if (updates.taskKey) params.set("taskKey", updates.taskKey)
  if (updates.elementId) params.set("elementId", updates.elementId)
  if (updates.role) params.set("role", updates.role)
  navigateTo(`${window.location.pathname}?${params.toString()}`)
}

export async function resolveWorkflowJobKey(
  context: CustomerTaskContext,
  customerStatus: Customer["status"] | undefined,
  t: TFunction
): Promise<{
  jobKey: string
  processInstanceKey: string
  elementId: string
  role: WorkflowTaskRole
} | null> {
  if (!context.processInstanceKey) {
    notify.error(
      t("crm.customers.workflow.task_context_missing_title"),
      t("crm.customers.workflow.task_context_missing_process")
    )
    return null
  }
  const elementId = effectiveBpmnElementId(
    context.role,
    context.elementId,
    customerStatus
  )
  if (!elementId) {
    notify.error(
      t("crm.customers.workflow.task_context_missing_title"),
      t("crm.customers.workflow.task_context_missing_element")
    )
    return null
  }
  const processInstanceKey = context.processInstanceKey
  if (context.taskKey) {
    return {
      jobKey: context.taskKey,
      processInstanceKey,
      elementId,
      role: context.role,
    }
  }

  // Six attempts (~4s) keep the non-blocking navigation honest: the submit
  // screen no longer waits, so this loop absorbs the projector latency.
  const task = await claimWithRetry({
    attempts: 6,
    delayMs: 700,
    claim: () =>
      customerApi.claimWorkflowTask({
        role: context.role,
        processInstanceKey,
        caseId: context.caseId,
        elementId,
      }),
    onLastError: (error) =>
      notify.error(
        t("crm.customers.workflow.task_context_missing_title"),
        error instanceof Error
          ? error.message
          : t("crm.customers.workflow.task_context_claim_failed")
      ),
  })
  if (!task) return null

  const jobKey = workflowKey(task.jobKey)
  if (!jobKey) {
    notify.error(
      t("crm.customers.workflow.task_context_missing_title"),
      t("crm.customers.workflow.task_context_missing_job_key")
    )
    return null
  }
  syncTaskContextSearch({
    taskKey: jobKey,
    elementId: task.elementId || elementId,
    role: task.candidateRole || context.role,
  })
  return {
    jobKey,
    processInstanceKey: workflowKey(task.processInstanceKey) || processInstanceKey,
    elementId: task.elementId || elementId,
    role: roleParam(task.candidateRole || context.role),
  }
}

export function useCustomerTaskContext() {
  const [searchParams] = useSearchParams()
  const workItemId = stringParam(searchParams, "workItemId")
  const fallback = useMemo(
    () => taskContextFromSearchParams(searchParams),
    [searchParams]
  )
  const {
    item: workItem,
    isLoading,
    isError,
  } = useWorkItemContext(workItemId, customerApi.getWorkflowWorkItem)

  const context = workItem ? taskContextFromWorkItem(workItem) : fallback
  return {
    context,
    hasWorkItemId: Boolean(workItemId),
    isError,
    isLoading,
  }
}

function taskContextFromWorkItem(item: WorkflowWorkItem): CustomerTaskContext {
  return {
    customerId: item.primaryObjectId ?? null,
    caseId: item.caseId,
    caseCode: item.caseCode,
    taskKey: workflowKey(item.jobKey),
    processInstanceKey: workflowKey(item.processInstanceKey),
    elementId: item.stepCode ?? null,
    role: roleParam(item.candidateRole ?? null),
    workItemStatus: item.status ?? null,
  }
}

export function hasTaskContext(context: CustomerTaskContext) {
  return Boolean(context.caseId || context.taskKey || context.elementId)
}

export function roleParam(value: string | null): WorkflowTaskRole {
  if (
    value === "CUSTOMER_RISK_CHECKER" ||
    value === "CUSTOMER_MAKER" ||
    value === "CUSTOMER_CHECKER"
  ) {
    return value
  }
  if (value && value.trim()) {
    console.warn(
      `[roleParam] Unknown role "${value}", falling back to CUSTOMER_CHECKER`
    )
  }
  return "CUSTOMER_CHECKER"
}

export function customerIdFromSearch() {
  return taskContextFromSearch().customerId
}

export function taskContextFromSearchParams(
  params: URLSearchParams
): CustomerTaskContext {
  return {
    customerId: params.get("customerId"),
    caseId: params.get("caseId"),
    caseCode: params.get("caseCode"),
    taskKey: stringParam(params, "taskKey"),
    processInstanceKey: stringParam(params, "processInstanceKey"),
    elementId: params.get("elementId"),
    role: roleParam(params.get("role")),
    workItemStatus: null,
  }
}

export function taskContextFromSearch(): CustomerTaskContext {
  return taskContextFromSearchParams(
    new URLSearchParams(window.location.search)
  )
}
