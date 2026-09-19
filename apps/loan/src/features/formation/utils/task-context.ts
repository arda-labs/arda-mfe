import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { useI18n } from "@workspace/i18n"
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
  formationApi,
  type FormationWorkItem,
  type LoanFormationRole,
  type LoanFormationStepCode,
} from "../../api"

// URL/deep-link helpers live in @workspace/workflow-task (shared with CRM);
// re-exported so existing imports keep working.
export { isViewOnlyTaskContext, stringParam, workflowKey }

/**
 * Task context của màn hình formation — mirror chặt của CRM
 * `features/customers/utils/task-context.ts` (deep-link workItemId →
 * taskContextFromWorkItem → resolveWorkflowJobKey claim retry 3 lần, sync
 * taskKey/elementId/role vào URL). Khác CRM ở role/stepCode: formation dùng
 * bộ LNM_* (LNM_MAKER/LNM_TWTD/LNM_POGD/LNM_GIDO/LNM_HODO) và element id
 * UT_MakerInput|UT_TWRevalidate|UT_PGDReview|UT_GDReview|UT_BoardReview
 * (BPMN lnm-loan-formation-v2).
 */
export type FormationTaskContext = {
  contractId: string | null
  caseId: string | null
  caseCode: string | null
  taskKey: string | null
  processInstanceKey: string | null
  elementId: LoanFormationStepCode | null
  role: LoanFormationRole
}

type TFunction = ReturnType<typeof useI18n>["t"]

const ROLES: LoanFormationRole[] = [
  "LNM_MAKER",
  "LNM_TWTD",
  "LNM_POGD",
  "LNM_GIDO",
  "LNM_HODO",
]

const STEPS: LoanFormationStepCode[] = [
  "UT_MakerInput",
  "UT_TWRevalidate",
  "UT_PGDReview",
  "UT_GDReview",
  "UT_BoardReview",
]

export function roleParam(value: string | null | undefined): LoanFormationRole {
  if (value && (ROLES as string[]).includes(value)) {
    return value as LoanFormationRole
  }
  if (value && value.trim()) {
    console.warn(`[formation/roleParam] Unknown role "${value}", fallback LNM_MAKER`)
  }
  return "LNM_MAKER"
}

export function stepParam(
  value: string | null | undefined
): LoanFormationStepCode | null {
  const trimmed = value?.trim()
  return trimmed && (STEPS as string[]).includes(trimmed)
    ? (trimmed as LoanFormationStepCode)
    : null
}

export function hasTaskContext(context: FormationTaskContext) {
  return Boolean(context.caseId || context.taskKey || context.elementId)
}

function taskContextFromWorkItem(item: FormationWorkItem): FormationTaskContext {
  return {
    contractId: item.primaryObjectId ?? null,
    caseId: item.caseId,
    caseCode: item.caseCode ?? null,
    taskKey: workflowKey(item.jobKey),
    processInstanceKey: workflowKey(item.processInstanceKey),
    elementId: stepParam(item.stepCode),
    role: roleParam(item.candidateRole),
  }
}

function taskContextFromSearchParams(
  params: URLSearchParams
): FormationTaskContext {
  return {
    contractId: stringParam(params, "contractId"),
    caseId: stringParam(params, "caseId"),
    caseCode: stringParam(params, "caseCode"),
    taskKey: stringParam(params, "taskKey"),
    processInstanceKey: stringParam(params, "processInstanceKey"),
    elementId: stepParam(params.get("elementId")),
    role: roleParam(params.get("role")),
  }
}

export function useFormationTaskContext() {
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
  } = useWorkItemContext(workItemId, formationApi.getWorkItem)

  const context = workItem ? taskContextFromWorkItem(workItem) : fallback
  return {
    context,
    workItem,
    hasWorkItemId: Boolean(workItemId),
    isError,
    isLoading,
  }
}

/**
 * Deep-link (?workItemId=) không sao chép taskKey/role vào URL — giữ đúng
 * pattern `syncTaskContextSearch` của CRM: chỉ sync khi vào bằng query phẳng
 * (caseId/processInstanceKey/elementId) để refresh giữ nguyên claim.
 */
function syncTaskContextSearch(updates: {
  taskKey?: string
  elementId?: string
  role?: string
}) {
  const params = new URLSearchParams(window.location.search)
  if (params.has("workItemId")) return
  if (updates.taskKey) params.set("taskKey", updates.taskKey)
  if (updates.elementId) params.set("elementId", updates.elementId)
  if (updates.role) params.set("role", updates.role)
  navigateTo(`${window.location.pathname}?${params.toString()}`)
}

/**
 * Claim user task của stage hiện tại (retry 3 lần — Zeebe có thể đang
 * project job) — mirror `resolveWorkflowJobKey` CRM. Trả về null sau khi đã
 * notify lỗi (caller chỉ cần thoát khỏi handler).
 */
export async function resolveWorkflowJobKey(
  context: FormationTaskContext,
  t: TFunction
): Promise<{
  jobKey: string
  processInstanceKey: string
  elementId: string
  role: LoanFormationRole
} | null> {
  if (!context.processInstanceKey) {
    notify.error(
      t("loan.formation.workflow.task_context_missing_title"),
      t("loan.formation.workflow.task_context_missing_process")
    )
    return null
  }
  if (!context.elementId) {
    notify.error(
      t("loan.formation.workflow.task_context_missing_title"),
      t("loan.formation.workflow.task_context_missing_element")
    )
    return null
  }
  const elementId = context.elementId
  const processInstanceKey = context.processInstanceKey
  if (context.taskKey) {
    return {
      jobKey: context.taskKey,
      processInstanceKey,
      elementId,
      role: context.role,
    }
  }

  // Three attempts (~1s): the formation screen claims after navigation, so the
  // loop only needs to absorb a short projector delay.
  const task = await claimWithRetry({
    attempts: 3,
    delayMs: 500,
    claim: () =>
      formationApi.claimTask({
        role: context.role,
        processInstanceKey,
        caseId: context.caseId,
        elementId,
      }),
    onLastError: (error) =>
      notify.error(
        t("loan.formation.workflow.task_context_missing_title"),
        error instanceof Error
          ? error.message
          : t("loan.formation.workflow.task_context_claim_failed")
      ),
  })
  if (!task) return null

  const jobKey = workflowKey(task.jobKey)
  if (!jobKey) {
    notify.error(
      t("loan.formation.workflow.task_context_missing_title"),
      t("loan.formation.workflow.task_context_missing_job_key")
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
