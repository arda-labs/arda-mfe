import { useEffect, useMemo, useState } from "react"

const BURST_MS = 12_000
const BURST_INTERVAL_MS = 1_500
const IDLE_INTERVAL_MS = 15_000

/** After submit/complete, workbench may land before Zeebe binds jobKey.
 *  Poll quickly for a short window, then fall back to the idle interval. */
export function useWorkbenchBurstRefetch(expectCaseCode?: string | null) {
  const [burstUntil, setBurstUntil] = useState(() => Date.now() + BURST_MS)

  useEffect(() => {
    setBurstUntil(Date.now() + BURST_MS)
  }, [expectCaseCode])

  useEffect(() => {
    const remaining = burstUntil - Date.now()
    if (remaining <= 0) return
    const timer = window.setTimeout(() => setBurstUntil(0), remaining)
    return () => window.clearTimeout(timer)
  }, [burstUntil])

  return useMemo(() => {
    if (burstUntil > Date.now()) return BURST_INTERVAL_MS
    return IDLE_INTERVAL_MS
  }, [burstUntil])
}

export function workbenchExpectCaseCode() {
  if (typeof window === "undefined") return null
  return (
    new URLSearchParams(window.location.search).get("caseCode")?.trim() || null
  )
}

export function workbenchHref(
  direction: "incoming" | "outgoing",
  caseCode?: string | null
) {
  const path =
    direction === "outgoing"
      ? "/workbench/outgoing-transactions"
      : "/workbench/incoming-transactions"
  const code = caseCode?.trim()
  if (!code) return path
  return `${path}?caseCode=${encodeURIComponent(code)}`
}
