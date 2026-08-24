import * as React from "react"

type UseDelayedBusyOptions = {
  /** Wait before showing busy UI — avoids flash on fast/cache hits. */
  delayMs?: number
  /** Keep busy UI visible at least this long once shown. */
  minVisibleMs?: number
}

/**
 * Debounced busy flag for overlays: show after `delayMs`, hide after `minVisibleMs` elapsed.
 */
export function useDelayedBusy(
  busy: boolean,
  { delayMs = 250, minVisibleMs = 300 }: UseDelayedBusyOptions = {}
) {
  const [visible, setVisible] = React.useState(false)
  const shownAtRef = React.useRef<number | null>(null)
  const delayTimerRef = React.useRef(0)
  const hideTimerRef = React.useRef(0)

  React.useEffect(() => {
    window.clearTimeout(delayTimerRef.current)
    window.clearTimeout(hideTimerRef.current)

    if (busy) {
      delayTimerRef.current = window.setTimeout(() => {
        shownAtRef.current = Date.now()
        setVisible(true)
      }, delayMs)
      return
    }

    if (!visible) {
      shownAtRef.current = null
      return
    }

    const shownAt = shownAtRef.current ?? Date.now()
    const elapsed = Date.now() - shownAt
    const remaining = Math.max(0, minVisibleMs - elapsed)

    hideTimerRef.current = window.setTimeout(() => {
      shownAtRef.current = null
      setVisible(false)
    }, remaining)
  }, [busy, delayMs, minVisibleMs, visible])

  React.useEffect(
    () => () => {
      window.clearTimeout(delayTimerRef.current)
      window.clearTimeout(hideTimerRef.current)
    },
    []
  )

  return visible
}
