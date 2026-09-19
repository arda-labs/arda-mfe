import { useSyncExternalStore } from "react"

// "Hỏi AI" bridge for error dialogs.
//
// The AI assistant (`@workspace/ai`) is shell-only, but error dialogs are
// rendered by remote MFEs too. `@workspace/ui` is deliberately NOT a Module
// Federation singleton (see federation.shared.ts), so a module-level flag
// would not cross the shell/remote bundle boundary. Everything therefore
// travels through the shared `window`:
//   - shell sets a capability flag so remotes know the AI button is usable;
//   - dialogs dispatch a CustomEvent with the prefilled prompt;
//   - shell listens, opens the Olorin panel, and composes the message.
// Both sides run in the same document, so this works across bundles.

export type ErrorAskAiDetail = {
  /** Fully-formed user message handed to the Olorin composer. */
  prompt: string
}

export const ERROR_ASK_AI_EVENT = "arda:error:ask-ai"

const CAPABILITY_EVENT = "arda:error:ask-ai-capability"
const CAPABILITY_KEY = "__ardaErrorAskAiEnabled"

type WindowWithCapability = Window &
  typeof globalThis & { [CAPABILITY_KEY]?: boolean }

function getWindow(): WindowWithCapability | undefined {
  return typeof window === "undefined"
    ? undefined
    : (window as WindowWithCapability)
}

/** Shell calls this once to advertise whether the AI assistant is available. */
export function setErrorAskAiEnabled(enabled: boolean): void {
  const target = getWindow()
  if (!target) return
  target[CAPABILITY_KEY] = enabled
  target.dispatchEvent(new Event(CAPABILITY_EVENT))
}

export function isErrorAskAiEnabled(): boolean {
  const target = getWindow()
  return Boolean(target?.[CAPABILITY_KEY])
}

function subscribeErrorAskAi(listener: () => void): () => void {
  const target = getWindow()
  if (!target) return () => {}
  target.addEventListener(CAPABILITY_EVENT, listener)
  return () => target.removeEventListener(CAPABILITY_EVENT, listener)
}

/** Reactive capability flag — hides the button when AI is disabled. */
export function useErrorAskAiEnabled(): boolean {
  return useSyncExternalStore(
    subscribeErrorAskAi,
    isErrorAskAiEnabled,
    () => false
  )
}

/** Open the AI assistant and prefill the given prompt. */
export function requestErrorAskAi(prompt: string): void {
  const target = getWindow()
  if (!target || !prompt.trim()) return
  target.dispatchEvent(
    new CustomEvent<ErrorAskAiDetail>(ERROR_ASK_AI_EVENT, {
      detail: { prompt },
    })
  )
}
