import type { WorkItem, WorkflowTaskAction } from "./types"

export const TASK_ACTIONS = {
  submit: "SUBMIT",
  approve: "APPROVE",
  requestChanges: "REQUEST_CHANGES",
  reject: "REJECT",
} as const

/**
 * Actions the server registry allows for this step. An empty/absent list means
 * the server sent no metadata (legacy rows) — callers keep their previous
 * behavior for that transition period instead of guessing here.
 */
export function allowedActions(
  item: WorkItem | null | undefined
): WorkflowTaskAction[] {
  return item?.allowedActions?.length ? item.allowedActions : []
}

/** Comment requirement for one action, from the server registry. */
export function requiresComment(
  item: WorkItem | null | undefined,
  action: WorkflowTaskAction
): boolean {
  if (item?.requiredCommentOn?.length) {
    return item.requiredCommentOn.includes(action)
  }
  return action === TASK_ACTIONS.requestChanges || action === TASK_ACTIONS.reject
}

/** Maker steps (input/revise) confirm with SUBMIT, not approve/reject. */
export function isMakerStep(item: WorkItem | null | undefined): boolean {
  return item?.stepKind === "INPUT" || item?.stepKind === "REVISE"
}

/** True when the work item can be acted on right now (ready + bound). */
export function isActionable(item: WorkItem | null | undefined): boolean {
  if (!item) return false
  if (item.status !== "READY" && item.status !== "CLAIMED") return false
  return item.jobKey != null && item.processInstanceKey != null
}
