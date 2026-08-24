type WorkflowCaseStep = {
  currentStep?: string
}

type WaitForWorkflowStepChangeInput = {
  caseId: string | null | undefined
  completedElementId: string
  loadCase: (caseId: string) => Promise<WorkflowCaseStep>
  timeoutMs?: number
  intervalMs?: number
  wait?: (delayMs: number) => Promise<void>
  now?: () => number
}

const DEFAULT_TIMEOUT_MS = 8_000
const DEFAULT_INTERVAL_MS = 250

export async function waitForWorkflowStepChange({
  caseId,
  completedElementId,
  loadCase,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  intervalMs = DEFAULT_INTERVAL_MS,
  wait = delay,
  now = Date.now,
}: WaitForWorkflowStepChangeInput): Promise<{
  step: string | null
  timedOut: boolean
}> {
  const normalizedCaseId = caseId?.trim()
  if (!normalizedCaseId) return { step: null, timedOut: false }

  const completedStep = normalizeUserTaskElementId(completedElementId)
  const startedAt = now()

  while (now() - startedAt < timeoutMs) {
    try {
      const workflowCase = await loadCase(normalizedCaseId)
      const currentStep = normalizeUserTaskElementId(
        workflowCase.currentStep ?? ""
      )
      if (currentStep && currentStep !== completedStep)
        return { step: currentStep, timedOut: false }
    } catch {
      // Completion already succeeded; tolerate transient projection/API reads.
    }
    await wait(intervalMs)
  }

  return { step: null, timedOut: true }
}

function normalizeUserTaskElementId(elementId: string) {
  switch (elementId.trim()) {
    case "Activity_CheckerReview":
      return "UT_CheckerReview"
    case "Activity_MakerRevise":
      return "UT_MakerRevise"
    default:
      return elementId.trim()
  }
}

function delay(delayMs: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, delayMs))
}

export type WaitForTaskReadyInput = {
  caseId: string | null | undefined
  stepCode: string
  getReadiness: (
    caseId: string,
    stepCode: string
  ) => Promise<{ ready: boolean; status: string }>
  timeoutMs?: number
  intervalMs?: number
  wait?: (delayMs: number) => Promise<void>
  now?: () => number
}

/**
 * Poll until a work item for a given stepCode is ready (or at least exists).
 * Unlike waitForWorkflowStepChange, this checks BEFORE the task is claimed,
 * so the caller can block navigation until Zeebe has assigned jobKey.
 */
export async function waitForTaskReady({
  caseId,
  stepCode,
  getReadiness,
  timeoutMs = 30_000,
  intervalMs = 500,
  wait = delay,
  now = Date.now,
}: WaitForTaskReadyInput): Promise<{ ready: boolean; timedOut: boolean }> {
  const normalizedCaseId = caseId?.trim()
  if (!normalizedCaseId) return { ready: false, timedOut: false }

  const startedAt = now()
  while (now() - startedAt < timeoutMs) {
    try {
      const res = await getReadiness(normalizedCaseId, stepCode)
      if (res.ready) return { ready: true, timedOut: false }
    } catch {
      // Transient API error — retry
    }
    await wait(intervalMs)
  }

  return { ready: false, timedOut: true }
}
