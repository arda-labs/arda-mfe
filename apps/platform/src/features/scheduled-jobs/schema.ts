import { z } from "zod"
import { isCronShape } from "./format"
import { JOB_LIMITS, type JobConfigUpdate, type ScheduledJob } from "./types"

export type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string

const recipientList = z.array(z.string().trim().min(1))

/** Bounds mirror `JobConfigUpdate.Validate` so a bad value never reaches the API. */
export function buildJobConfigSchema(t: TranslateFn) {
  const v = "platform.scheduled_jobs.validation"
  const { timeoutSeconds, maxAttempts, retryBackoffSeconds, maxRecipients } = JOB_LIMITS
  return z
    .object({
      cron_expr: z.string().trim(),
      timezone: z.string().trim().min(1, t(`${v}.timezone_required`)),
      enabled: z.boolean(),
      timeout_seconds: z
        .number(t(`${v}.number_required`))
        .int(t(`${v}.number_required`))
        .min(timeoutSeconds.min, t(`${v}.timeout_range`, timeoutSeconds))
        .max(timeoutSeconds.max, t(`${v}.timeout_range`, timeoutSeconds)),
      max_attempts: z
        .number(t(`${v}.number_required`))
        .int(t(`${v}.number_required`))
        .min(maxAttempts.min, t(`${v}.attempts_range`, maxAttempts))
        .max(maxAttempts.max, t(`${v}.attempts_range`, maxAttempts)),
      retry_backoff_seconds: z
        .number(t(`${v}.number_required`))
        .int(t(`${v}.number_required`))
        .min(retryBackoffSeconds.min, t(`${v}.backoff_range`, retryBackoffSeconds))
        .max(retryBackoffSeconds.max, t(`${v}.backoff_range`, retryBackoffSeconds)),
      notify_user_ids: recipientList,
      notify_group_ids: recipientList,
      notify_role_codes: recipientList,
    })
    .superRefine((values, ctx) => {
      if (values.cron_expr && !isCronShape(values.cron_expr)) {
        ctx.addIssue({
          code: "custom",
          message: t(`${v}.cron_shape`),
          path: ["cron_expr"],
        })
      }
      if (values.enabled && !values.cron_expr) {
        ctx.addIssue({
          code: "custom",
          message: t(`${v}.cron_required_when_enabled`),
          path: ["cron_expr"],
        })
      }
      const recipients =
        values.notify_user_ids.length +
        values.notify_group_ids.length +
        values.notify_role_codes.length
      if (recipients > maxRecipients) {
        ctx.addIssue({
          code: "custom",
          message: t(`${v}.too_many_recipients`, { max: maxRecipients }),
          path: ["notify_role_codes"],
        })
      }
    })
}

export type JobConfigFormValues = z.infer<ReturnType<typeof buildJobConfigSchema>>

export function toJobConfigFormValues(job: ScheduledJob): JobConfigFormValues {
  return {
    cron_expr: job.cron_expr ?? "",
    timezone: job.timezone,
    enabled: job.enabled,
    timeout_seconds: job.timeout_seconds,
    max_attempts: job.max_attempts,
    retry_backoff_seconds: job.retry_backoff_seconds,
    notify_user_ids: job.notify_user_ids ?? [],
    notify_group_ids: job.notify_group_ids ?? [],
    notify_role_codes: job.notify_role_codes ?? [],
  }
}

/** Form → wire body. Empty cron becomes `null` (manual only); `version` guards the PATCH. */
export function toJobConfigUpdate(values: JobConfigFormValues, version: number): JobConfigUpdate {
  return {
    cron_expr: values.cron_expr.trim() || null,
    timezone: values.timezone.trim(),
    enabled: values.enabled,
    timeout_seconds: values.timeout_seconds,
    max_attempts: values.max_attempts,
    retry_backoff_seconds: values.retry_backoff_seconds,
    notify_user_ids: values.notify_user_ids,
    notify_group_ids: values.notify_group_ids,
    notify_role_codes: values.notify_role_codes,
    version,
  }
}

/** Quick picks offered next to the cron field ("daily at…"); values are 5-field cron. */
export const CRON_PRESETS = [
  { key: "daily_06", cron: "0 6 * * *" },
  { key: "daily_02_30", cron: "30 2 * * *" },
  { key: "weekdays_08", cron: "0 8 * * 1-5" },
  { key: "hourly", cron: "0 * * * *" },
  { key: "every_15m", cron: "*/15 * * * *" },
] as const
