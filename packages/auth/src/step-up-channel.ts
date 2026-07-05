export type StepUpRequest = {
  resolve: (verified: boolean) => void
}

let openStepUp: ((request: StepUpRequest) => void) | undefined
let stepUpInflight: Promise<boolean> | null = null

export function requestStepUp() {
  if (stepUpInflight) return stepUpInflight

  stepUpInflight = new Promise<boolean>((resolve) => {
    if (!openStepUp) {
      resolve(false)
      return
    }
    openStepUp({
      resolve: (verified) => {
        resolve(verified)
      },
    })
  }).finally(() => {
    stepUpInflight = null
  })

  return stepUpInflight
}

export function setStepUpHandler(handler: (request: StepUpRequest) => void) {
  openStepUp = handler
  return () => {
    if (openStepUp === handler) openStepUp = undefined
  }
}
