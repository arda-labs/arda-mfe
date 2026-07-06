import { notify } from "@workspace/notifications/notify"
import { navigateTo } from "@workspace/core/routing"
import { customerApi, type Customer, type WorkflowTaskRole } from "../api"

export type CustomerTaskContext = {
  customerId: string | null
  caseId: string | null
  caseCode: string | null
  taskKey: string | null
  processInstanceKey: string | null
  elementId: string | null
  role: WorkflowTaskRole
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
      return elementId === "UT_MakerRevise" || elementId === "Activity_MakerRevise"
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
  if (updates.taskKey) params.set("taskKey", updates.taskKey)
  if (updates.elementId) params.set("elementId", updates.elementId)
  if (updates.role) params.set("role", updates.role)
  navigateTo(`${window.location.pathname}?${params.toString()}`)
}

export async function resolveWorkflowJobKey(
  context: CustomerTaskContext,
  customerStatus?: Customer["status"]
): Promise<{
  jobKey: string
  processInstanceKey: string
  elementId: string
  role: WorkflowTaskRole
} | null> {
  if (!context.processInstanceKey) {
    notify.error(
      "Thiếu ngữ cảnh task BPM",
      "Không có processInstanceKey — mở lại việc từ workbench."
    )
    return null
  }
  const elementId = effectiveBpmnElementId(
    context.role,
    context.elementId,
    customerStatus
  )
  if (!elementId) {
    notify.error("Thiếu ngữ cảnh task BPM", "Không xác định được bước BPM (elementId).")
    return null
  }
  if (context.taskKey) {
    return {
      jobKey: context.taskKey,
      processInstanceKey: context.processInstanceKey,
      elementId,
      role: context.role,
    }
  }
  try {
    const task = await customerApi.claimWorkflowTask({
      role: context.role,
      processInstanceKey: context.processInstanceKey,
      caseId: context.caseId,
      elementId,
    })
    const jobKey = workflowKey(task.jobKey)
    if (!jobKey) {
      notify.error(
        "Thiếu ngữ cảnh task BPM",
        "Không lấy được task key từ Zeebe — kiểm tra workflow-service và Zeebe."
      )
      return null
    }
    const processInstanceKey =
      workflowKey(task.processInstanceKey) || context.processInstanceKey
    syncTaskContextSearch({
      taskKey: jobKey,
      elementId: task.elementId || elementId,
      role: task.candidateRole || context.role,
    })
    return {
      jobKey,
      processInstanceKey,
      elementId: task.elementId || elementId,
      role: roleParam(task.candidateRole || context.role),
    }
  } catch (error) {
    notify.error(
      "Thiếu ngữ cảnh task BPM",
      error instanceof Error ? error.message : "Không claim được task từ workflow."
    )
    return null
  }
}

export function taskContextFromSearch(): CustomerTaskContext {
  const params = new URLSearchParams(window.location.search)
  return {
    customerId: params.get("customerId"),
    caseId: params.get("caseId"),
    caseCode: params.get("caseCode"),
    taskKey: stringParam(params, "taskKey"),
    processInstanceKey: stringParam(params, "processInstanceKey"),
    elementId: params.get("elementId"),
    role: roleParam(params.get("role")),
  }
}

export function hasTaskContext(context: CustomerTaskContext) {
  return Boolean(context.caseId || context.taskKey || context.elementId)
}

export function stringParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim()
  return value || null
}

export function workflowKey(value: string | number | null | undefined) {
  if (value == null) return null
  const text = String(value).trim()
  return text || null
}

export function roleParam(value: string | null): WorkflowTaskRole {
  if (value === "CUSTOMER_RISK_CHECKER" || value === "CUSTOMER_MAKER") return value
  return "CUSTOMER_CHECKER"
}

export function customerIdFromSearch() {
  return taskContextFromSearch().customerId
}
