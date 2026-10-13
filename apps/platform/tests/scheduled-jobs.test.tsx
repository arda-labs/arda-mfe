import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { I18nProvider } from "@workspace/i18n"
import { runsPath } from "../src/features/scheduled-jobs/api"
import {
  apiErrorCode,
  describeCron,
  extractEvalCases,
  formatDuration,
  humanCron,
  isCronShape,
  isFailureStatus,
  runsSearch,
  splitRecipients,
  statusVariant,
} from "../src/features/scheduled-jobs/format"
import {
  buildJobConfigSchema,
  toJobConfigFormValues,
  toJobConfigUpdate,
} from "../src/features/scheduled-jobs/schema"
import { ScheduledJobsTable } from "../src/features/scheduled-jobs/components/ScheduledJobsTable"
import { RecipientsInput } from "../src/features/scheduled-jobs/components/RecipientsInput"
import type { ScheduledJob } from "../src/features/scheduled-jobs/types"
import { cobRunRequest } from "../src/features/jobs/api"
import { parseJobsTab, scheduledRunHref } from "../src/features/jobs/tabs"

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key

const job: ScheduledJob = {
  code: "ai-eval",
  name: "AI retrieval eval",
  owner_service: "ai-service",
  path: "/internal/jobs/ai-eval",
  cron_expr: "0 6 * * *",
  timezone: "Asia/Ho_Chi_Minh",
  enabled: true,
  timeout_seconds: 600,
  max_attempts: 2,
  retry_backoff_seconds: 120,
  notify_tenant_id: "00000000-0000-0000-0000-000000000010",
  notify_user_ids: [],
  notify_group_ids: null,
  notify_role_codes: ["SUPER_ADMIN"],
  next_run_at: "2026-10-12T23:00:00Z",
  last_status: "FAILED",
  target_configured: false,
  retired_at: null,
  version: 3,
  updated_at: "2026-10-11T00:00:00Z",
  updated_by: null,
}

describe("scheduled jobs adapters", () => {
  test("runsSearch encodes paging and optional status", () => {
    expect(runsSearch(1).toString()).toBe("page=1&per_page=20")
    expect(runsSearch(2, "FAILED").toString()).toBe("page=2&per_page=20&status=FAILED")
    expect(runsSearch(3, "").toString()).toBe("page=3&per_page=20")
  })

  test("runsPath targets the two-segment runs route", () => {
    expect(runsPath("eod", 1, "TIMED_OUT")).toBe(
      "/api/platform/scheduled-jobs/eod/runs?page=1&per_page=20&status=TIMED_OUT"
    )
  })

  test("failure statuses and badge variants", () => {
    expect(isFailureStatus("FAILED")).toBe(true)
    expect(isFailureStatus("TIMED_OUT")).toBe(true)
    expect(isFailureStatus("SKIPPED")).toBe(false)
    expect(isFailureStatus(null)).toBe(false)
    expect(statusVariant("SUCCEEDED")).toBe("success")
    expect(statusVariant("TIMED_OUT")).toBe("destructive")
    expect(statusVariant("RUNNING")).toBe("info")
    expect(statusVariant("SKIPPED")).toBe("secondary")
  })

  test("apiErrorCode reads the problem code off any thrown value", () => {
    expect(apiErrorCode(Object.assign(new Error("x"), { code: "platform.jobs.already_running" }))).toBe(
      "platform.jobs.already_running"
    )
    expect(apiErrorCode(new Error("plain"))).toBeNull()
    expect(apiErrorCode("string")).toBeNull()
  })

  test("formatDuration", () => {
    expect(formatDuration("2026-10-12T00:00:00Z", "2026-10-12T00:01:05Z")).toBe("1m 05s")
    expect(formatDuration("2026-10-12T00:00:00Z", "2026-10-12T00:00:07Z")).toBe("7s")
    expect(formatDuration("2026-10-12T00:00:00Z", null)).toBeNull()
  })

  test("cron shape matches the five-field backend parser", () => {
    expect(isCronShape("0 6 * * *")).toBe(true)
    expect(isCronShape("*/15 * * * *")).toBe(true)
    expect(isCronShape("* * *")).toBe(false)
    expect(isCronShape("@daily")).toBe(false)
    expect(isCronShape("TZ=UTC 0 6 * * *")).toBe(false)
    expect(isCronShape("")).toBe(false)
  })

  test("describeCron recognises common shapes and falls back to null", () => {
    expect(describeCron("0 6 * * *")).toEqual({ key: "daily_at", params: { time: "06:00" } })
    expect(describeCron("30 2 * * *")).toEqual({ key: "daily_at", params: { time: "02:30" } })
    expect(describeCron("0 8 * * 1-5")).toEqual({ key: "weekdays_at", params: { time: "08:00" } })
    expect(describeCron("*/15 * * * *")).toEqual({ key: "every_n_minutes", params: { n: 15 } })
    expect(describeCron("5 * * * *")).toEqual({ key: "hourly_at", params: { minute: "05" } })
    expect(describeCron("0 0 1 * *")).toEqual({ key: "monthly_at", params: { time: "00:00", day: "1" } })
    expect(describeCron("0 6 * * 1,3")).toBeNull()
    expect(describeCron(null)).toBeNull()
    expect(humanCron("0 6 * * *", t)).toBe('platform.scheduled_jobs.cron.daily_at:{"time":"06:00"}')
    expect(humanCron("1 2 3 4 5", t)).toBe("")
  })

  test("extractEvalCases tolerates arbitrary result JSON", () => {
    expect(extractEvalCases(null)).toEqual([])
    expect(extractEvalCases({ summary: { cases: "nope" } })).toEqual([])
    expect(
      extractEvalCases({
        summary: { cases: [{ id: "c1", passed: true, recall: 0.5 }, { id: "c2", passed: false, error: "miss" }, { nope: 1 }] },
      })
    ).toEqual([
      { id: "c1", passed: true, recall: 0.5, error: undefined },
      { id: "c2", passed: false, recall: undefined, error: "miss" },
    ])
  })

  test("splitRecipients splits on commas, semicolons and whitespace", () => {
    expect(splitRecipients(" SUPER_ADMIN, OPS;  AUDIT ")).toEqual(["SUPER_ADMIN", "OPS", "AUDIT"])
  })
})

describe("scheduled jobs form schema", () => {
  const schema = buildJobConfigSchema(t)

  test("accepts the job's current config and maps to the wire body", () => {
    const values = toJobConfigFormValues(job)
    expect(values.notify_group_ids).toEqual([])
    const parsed = schema.safeParse(values)
    expect(parsed.success).toBe(true)
    expect(toJobConfigUpdate(values, job.version)).toEqual({
      cron_expr: "0 6 * * *",
      timezone: "Asia/Ho_Chi_Minh",
      enabled: true,
      timeout_seconds: 600,
      max_attempts: 2,
      retry_backoff_seconds: 120,
      notify_user_ids: [],
      notify_group_ids: [],
      notify_role_codes: ["SUPER_ADMIN"],
      version: 3,
    })
  })

  test("empty cron becomes null (manual only) and is allowed when disabled", () => {
    const values = { ...toJobConfigFormValues(job), cron_expr: "  ", enabled: false }
    expect(schema.safeParse(values).success).toBe(true)
    expect(toJobConfigUpdate(values, 1).cron_expr).toBeNull()
  })

  test("rejects out-of-range numbers, bad cron shapes and enabled-without-cron", () => {
    const base = toJobConfigFormValues(job)
    const issues = (input: unknown) => {
      const result = schema.safeParse(input)
      return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."))
    }
    expect(issues({ ...base, timeout_seconds: 5 })).toContain("timeout_seconds")
    expect(issues({ ...base, timeout_seconds: 3601 })).toContain("timeout_seconds")
    expect(issues({ ...base, max_attempts: 0 })).toContain("max_attempts")
    expect(issues({ ...base, max_attempts: 6 })).toContain("max_attempts")
    expect(issues({ ...base, retry_backoff_seconds: -1 })).toContain("retry_backoff_seconds")
    expect(issues({ ...base, retry_backoff_seconds: 3601 })).toContain("retry_backoff_seconds")
    expect(issues({ ...base, timeout_seconds: Number.NaN })).toContain("timeout_seconds")
    expect(issues({ ...base, cron_expr: "* * *" })).toContain("cron_expr")
    expect(issues({ ...base, cron_expr: "@daily" })).toContain("cron_expr")
    expect(issues({ ...base, cron_expr: "", enabled: true })).toContain("cron_expr")
    expect(issues({ ...base, timezone: " " })).toContain("timezone")
    expect(issues({ ...base, notify_role_codes: Array.from({ length: 51 }, (_, i) => `R${i}`) })).toContain(
      "notify_role_codes"
    )
  })
})

describe("jobs page helpers", () => {
  test("parseJobsTab defaults to scheduled and forces it for run deep links", () => {
    expect(parseJobsTab(null, null)).toBe("scheduled")
    expect(parseJobsTab("eod", null)).toBe("eod")
    expect(parseJobsTab("eod", "run-1")).toBe("scheduled")
    expect(parseJobsTab("bogus", null)).toBe("scheduled")
  })

  test("COB request carries business_date only when given", () => {
    expect(cobRunRequest("2026-10-12")).toEqual({ params: { business_date: "2026-10-12" } })
    expect(cobRunRequest("")).toEqual({ params: {} })
    expect(scheduledRunHref("abc")).toBe("/admin/jobs?tab=scheduled&run=abc")
  })
})

describe("scheduled jobs UI", () => {
  test("table shows schedule, failure badge and unconfigured target warning", () => {
    const html = renderToStaticMarkup(
      <I18nProvider>
        <ScheduledJobsTable
          jobs={[job]}
          onEdit={() => {}}
          onRun={() => {}}
          onHistory={() => {}}
          runningCode={null}
          renderPreview={(row) => <span data-testid="preview-slot">{row.code}</span>}
        />
      </I18nProvider>
    )
    expect(html).toContain("AI retrieval eval")
    expect(html).toContain("0 6 * * *")
    expect(html).toContain("FAILED")
    expect(html).toContain('data-testid="target-not-configured"')
    expect(html).toContain('data-testid="preview-slot"')
    expect(html).toContain('data-testid="job-row-ai-eval"')
  })

  test("table renders the empty state without rows", () => {
    const html = renderToStaticMarkup(
      <I18nProvider>
        <ScheduledJobsTable jobs={[]} onEdit={() => {}} onRun={() => {}} onHistory={() => {}} runningCode={null} />
      </I18nProvider>
    )
    expect(html).not.toContain("job-row-")
  })

  test("recipients input renders existing tags", () => {
    const html = renderToStaticMarkup(
      <I18nProvider>
        <RecipientsInput id="roles" label="Roles" value={["SUPER_ADMIN", "OPS"]} onChange={() => {}} placeholder="" />
      </I18nProvider>
    )
    expect(html).toContain("SUPER_ADMIN")
    expect(html).toContain("OPS")
    expect(html).toContain('data-testid="roles-tags"')
  })
})
