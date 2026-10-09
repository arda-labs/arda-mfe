import { useEffect } from "react"

/**
 * Warns before the tab is closed or reloaded while a form has unsaved edits.
 * The shell uses BrowserRouter (no data router), so in-app navigation cannot be
 * blocked here; pages confirm their own Cancel/Back actions with `dirty`.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [dirty])
}
