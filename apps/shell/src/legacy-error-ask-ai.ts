// Compatibility adapter for remotes built before the "Ask AI" channel moved to
// @workspace/notifications (2026-10-12). Their own bundled @workspace/ui still
// shows the button only while window.__ardaErrorAskAiEnabled is true and sends
// the prompt as an "arda:error:ask-ai" window event. Remove this file once
// every remote has been redeployed past that change (docs/refactor-program.md:
// remove old adapters after the observed compatibility window).
const CAPABILITY_KEY = "__ardaErrorAskAiEnabled"
const CAPABILITY_EVENT = "arda:error:ask-ai-capability"
const ASK_EVENT = "arda:error:ask-ai"

type LegacyWindow = Window & typeof globalThis & { [CAPABILITY_KEY]?: boolean }

function advertise(enabled: boolean) {
  ;(window as LegacyWindow)[CAPABILITY_KEY] = enabled
  window.dispatchEvent(new Event(CAPABILITY_EVENT))
}

/** Serves legacy remotes with the same handler; returns the cleanup. */
export function bridgeLegacyErrorAskAi(handler: (prompt: string) => void) {
  function onAsk(event: Event) {
    const prompt = (event as CustomEvent<{ prompt?: string }>).detail?.prompt
    if (prompt) handler(prompt)
  }
  window.addEventListener(ASK_EVENT, onAsk)
  advertise(true)
  return () => {
    window.removeEventListener(ASK_EVENT, onAsk)
    advertise(false)
  }
}
