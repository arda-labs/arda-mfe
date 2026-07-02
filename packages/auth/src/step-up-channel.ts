export type StepUpRequest = {
  resolve: (verified: boolean) => void
}

let openStepUp: ((request: StepUpRequest) => void) | undefined

export function requestStepUp() {
  return new Promise<boolean>((resolve) => {
    if (!openStepUp) {
      resolve(false)
      return
    }
    openStepUp({ resolve })
  })
}

export function setStepUpHandler(handler: (request: StepUpRequest) => void) {
  openStepUp = handler
  return () => {
    if (openStepUp === handler) openStepUp = undefined
  }
}
