import type { SubmissionStatus } from "./list-query"

export type SubmissionStep = {
  /** Status the step stands for; doubles as its label key. */
  status: SubmissionStatus
  state: "done" | "current" | "todo"
}

/**
 * Nháp → Đã trình → Đã duyệt | Từ chối for LifecycleSteps (BE
 * statistical_service: Submit moves DRAFT→SUBMITTED, the checker decision
 * SUBMITTED→APPROVED|REJECTED; both ends are final). The last step shows
 * the decision once it is known.
 */
export function submissionLifecycle(status: string): SubmissionStep[] {
  const decision: SubmissionStatus =
    status === "REJECTED" ? "REJECTED" : "APPROVED"
  const order: SubmissionStatus[] = ["DRAFT", "SUBMITTED", decision]
  const reached = order.indexOf(status as SubmissionStatus)
  return order.map((step, index) => ({
    status: step,
    state:
      reached < 0 || index > reached
        ? "todo"
        : index < reached || status === "APPROVED"
          ? "done"
          : "current",
  }))
}
