import { useSyncExternalStore } from "react"

/**
 * "Ask AI about this error" channel. The shell registers a handler while the
 * Olorin assistant is available; error dialogs in the shell and in every
 * remote read it. This package is a Module Federation singleton, so the
 * handler crosses the shell/remote bundle boundary without a window global.
 */
export type ErrorAskAiHandler = (prompt: string) => void

let handler: ErrorAskAiHandler | undefined
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Registers the handler; the returned cleanup only clears its own handler. */
export function setErrorAskAiHandler(next: ErrorAskAiHandler) {
  handler = next
  emit()
  return () => {
    if (handler !== next) return
    handler = undefined
    emit()
  }
}

/** The registered handler, or undefined when no host offers the assistant. */
export function getErrorAskAiHandler(): ErrorAskAiHandler | undefined {
  return handler
}

/** React binding for {@link getErrorAskAiHandler}; re-renders on change. */
export function useErrorAskAiHandler(): ErrorAskAiHandler | undefined {
  return useSyncExternalStore(subscribe, getErrorAskAiHandler, () => undefined)
}
