// Prefill the Olorin chat composer from outside the provider tree — e.g. the
// error dialog's "Ask AI" action, which runs before/independently of the panel
// being mounted. The provider registers a sink on mount; requests that arrive
// earlier are queued and flushed once it is ready.

export type OlorinComposeRequest = {
  /** User message to place in the composer. */
  text: string
}

type OlorinComposeSink = (request: OlorinComposeRequest) => void

let sink: OlorinComposeSink | undefined
let pending: OlorinComposeRequest | undefined

export function registerOlorinComposeSink(next: OlorinComposeSink): () => void {
  sink = next
  const queued = pending
  pending = undefined
  if (queued) next(queued)
  return () => {
    if (sink === next) sink = undefined
  }
}

export function composeOlorinMessage(request: OlorinComposeRequest): void {
  if (!request.text.trim()) return
  if (sink) {
    sink(request)
    return
  }
  pending = request
}
