import type { EvalCase, JobStatus } from "./types"

export const RUNS_PAGE_SIZE = 20

/** Query string for `GET /scheduled-jobs/{code}/runs` (page/per_page/status). */
export function runsSearch(page: number, status?: JobStatus | ""): URLSearchParams {
  const search = new URLSearchParams({
    page: String(page),
    per_page: String(RUNS_PAGE_SIZE),
  })
  if (status) search.set("status", status)
  return search
}

export function isFailureStatus(status: string | null | undefined): boolean {
  return status === "FAILED" || status === "TIMED_OUT"
}

export type StatusVariant = "success" | "destructive" | "info" | "secondary"

/** Badge colour policy for run / last statuses. */
export function statusVariant(status: string | null | undefined): StatusVariant {
  if (status === "SUCCEEDED") return "success"
  if (isFailureStatus(status)) return "destructive"
  if (status === "RUNNING") return "info"
  return "secondary"
}

/** Problem `code` of an API error, when the thrown value carries one. */
export function apiErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null
  const code = (error as { code?: unknown }).code
  return typeof code === "string" && code ? code : null
}

/** "1m 05s" style duration between two timestamps; `null` while still running. */
export function formatDuration(
  startedAt: string | null | undefined,
  finishedAt: string | null | undefined
): string | null {
  if (!startedAt || !finishedAt) return null
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`
}

const CRON_FIELD_COUNT = 5

/** Five-field cron check matching the backend parser (no `@` descriptors, no TZ prefix). */
export function isCronShape(expr: string): boolean {
  const trimmed = expr.trim()
  if (!trimmed) return false
  if (trimmed.startsWith("@") || trimmed.startsWith("TZ=") || trimmed.startsWith("CRON_TZ=")) {
    return false
  }
  return trimmed.split(/\s+/).length === CRON_FIELD_COUNT
}

export type CronDescription =
  | { key: "every_minute" }
  | { key: "every_n_minutes"; params: { n: number } }
  | { key: "hourly_at"; params: { minute: string } }
  | { key: "daily_at"; params: { time: string } }
  | { key: "weekdays_at"; params: { time: string } }
  | { key: "weekly_at"; params: { time: string; day: string } }
  | { key: "monthly_at"; params: { time: string; day: string } }

const pad2 = (value: string) => value.padStart(2, "0")
const isNumber = (value: string) => /^\d+$/.test(value)

/**
 * Structured, translatable description of the common cron shapes. Returns `null`
 * for anything it does not recognise so callers fall back to the raw expression.
 */
export function describeCron(expr: string | null | undefined): CronDescription | null {
  if (!expr || !isCronShape(expr)) return null
  const [minute, hour, dom, month, dow] = expr.trim().split(/\s+/)
  if (minute === "*" && hour === "*" && dom === "*" && month === "*" && dow === "*") {
    return { key: "every_minute" }
  }
  const everyN = /^\*\/(\d+)$/.exec(minute)
  if (everyN && hour === "*" && dom === "*" && month === "*" && dow === "*") {
    return { key: "every_n_minutes", params: { n: Number(everyN[1]) } }
  }
  if (!isNumber(minute)) return null
  if (hour === "*" && dom === "*" && month === "*" && dow === "*") {
    return { key: "hourly_at", params: { minute: pad2(minute) } }
  }
  if (!isNumber(hour)) return null
  const time = `${pad2(hour)}:${pad2(minute)}`
  if (dom === "*" && month === "*") {
    if (dow === "*") return { key: "daily_at", params: { time } }
    if (dow === "1-5") return { key: "weekdays_at", params: { time } }
    if (isNumber(dow)) return { key: "weekly_at", params: { time, day: dow } }
    return null
  }
  if (isNumber(dom) && month === "*" && dow === "*") {
    return { key: "monthly_at", params: { time, day: dom } }
  }
  return null
}

/** Translated description or "" when the expression is not a known shape. */
export function humanCron(
  expr: string | null | undefined,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const description = describeCron(expr)
  if (!description) return ""
  const params = "params" in description ? description.params : undefined
  return t(`platform.scheduled_jobs.cron.${description.key}`, params)
}

/** Splits pasted / typed recipient input on commas, semicolons and whitespace. */
export function splitRecipients(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

/** Pretty JSON for the collapsed result panel; tolerant of non-JSON input. */
export function formatResultJson(result: unknown): string {
  if (result === undefined || result === null) return ""
  if (typeof result === "string") return result
  try {
    return JSON.stringify(result, null, 2)
  } catch {
    return String(result)
  }
}

/** Extracts an ai-eval style `summary.cases` list from a run result, if present. */
export function extractEvalCases(result: unknown): EvalCase[] {
  if (!result || typeof result !== "object") return []
  const summary = (result as { summary?: unknown }).summary
  if (!summary || typeof summary !== "object") return []
  const cases = (summary as { cases?: unknown }).cases
  if (!Array.isArray(cases)) return []
  return cases.flatMap((item): EvalCase[] => {
    if (!item || typeof item !== "object") return []
    const record = item as Record<string, unknown>
    if (typeof record.id !== "string") return []
    return [
      {
        id: record.id,
        passed: record.passed === true,
        error: typeof record.error === "string" ? record.error : undefined,
        recall: typeof record.recall === "number" ? record.recall : undefined,
      },
    ]
  })
}
