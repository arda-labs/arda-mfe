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
}: WaitForWorkflowStepChangeInput) {
  const normalizedCaseId = caseId?.trim()
  if (!normalizedCaseId) return null

  const completedStep = normalizeUserTaskElementId(completedElementId)
  const startedAt = now()

  while (now() - startedAt < timeoutMs) {
    try {
      const workflowCase = await loadCase(normalizedCaseId)
      const currentStep = normalizeUserTaskElementId(
        workflowCase.currentStep ?? ""
      )
      if (currentStep && currentStep !== completedStep) return currentStep
    } catch {
      // Completion already succeeded; tolerate transient projection/API reads.
    }
    await wait(intervalMs)
  }

  return null
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
