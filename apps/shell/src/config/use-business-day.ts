import { useEffect, useState } from "react"
import { getCanonical } from "@workspace/api"

/** platform-service system date (GET /api/platform/calendar/status). */
export type BusinessDay = {
  branch_code: string
  current_business_date: string
  previous_business_date: string
  next_business_date: string
  status: string
  last_eod_at?: string
}

const REFRESH_MS = 5 * 60 * 1000

/**
 * Business date + EOD state for the context pill. Re-read every few minutes
 * and when the tab regains focus, so an EOD run elsewhere shows up without a
 * reload. `error` stays true while the date is unknown; the pill then says so
 * instead of showing a stale or invented date.
 */
export function useBusinessDay(enabled: boolean) {
  const [day, setDay] = useState<BusinessDay | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const load = () =>
      getCanonical<BusinessDay>("/api/platform/calendar/status?branchCode=HEAD_OFFICE")
        .then((next) => {
          if (cancelled) return
          setDay(next)
          setError(false)
        })
        .catch(() => {
          if (!cancelled) setError(true)
        })
    void load()
    const timer = window.setInterval(load, REFRESH_MS)
    const onFocus = () => void load()
    window.addEventListener("focus", onFocus)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener("focus", onFocus)
    }
  }, [enabled])

  return { day, error }
}
