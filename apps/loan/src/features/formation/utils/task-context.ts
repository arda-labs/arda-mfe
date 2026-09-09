import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { navigateTo } from "@workspace/ui/shell/routing"
import {
  formationApi,
  type FormationClaimedTask,
  type FormationWorkItem,
  type LoanFormationRole,
  type LoanFormationStepCode,
} from "../../api"

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

export function stringParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim()
  return value || null
}

export function workflowKey(value: string | number | null | undefined) {
  if (value == null) return null
  const text = String(value).trim()
  return text || null
}

export function isViewOnlyTaskContext() {
  return new URLSearchParams(window.location.search).get("mode") === "view"
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
  const [workItem, setWorkItem] = useState<FormationWorkItem | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(workItemId))
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    if (!workItemId) {
      setWorkItem(null)
      setIsLoading(false)
      setIsError(false)
      return
    }
    let cancelled = false
    setIsLoading(true)
    setIsError(false)
    formationApi
      .getWorkItem(workItemId)
      .then((item) => {
        if (!cancelled) setWorkItem(item)
      })
      .catch(() => {
        if (!cancelled) setIsError(true)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [workItemId])

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
  if (context.taskKey) {
    return {
      jobKey: context.taskKey,
      processInstanceKey: context.processInstanceKey,
      elementId,
      role: context.role,
    }
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    try {
      const task: FormationClaimedTask = await formationApi.claimTask({
        role: context.role,
        processInstanceKey: context.processInstanceKey,
        caseId: context.caseId,
        elementId,
      })
      const jobKey = workflowKey(task.jobKey)
      if (!jobKey) {
        notify.error(
          t("loan.formation.workflow.task_context_missing_title"),
          t("loan.formation.workflow.task_context_missing_job_key")
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
      // Chỉ notify ở lần cuối — các lần retry đầu fail là tình huống thường.
      if (attempt === 2) {
        notify.error(
          t("loan.formation.workflow.task_context_missing_title"),
          error instanceof Error
            ? error.message
            : t("loan.formation.workflow.task_context_claim_failed")
        )
      }
    }
  }
  return null
}
