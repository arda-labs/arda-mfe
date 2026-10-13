import { useEffect, useMemo, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { translateApiError, useI18n } from "@workspace/i18n"
import { formatDateTime } from "@workspace/format"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"
import { notify } from "@workspace/ui/feedback/notify"
import { apiErrorCode, humanCron } from "../format"
import { useCronPreview, useReloadJobs, useUpdateJob } from "../hooks"
import {
  CRON_PRESETS,
  buildJobConfigSchema,
  toJobConfigFormValues,
  toJobConfigUpdate,
  type JobConfigFormValues,
} from "../schema"
import { JOB_LIMITS, JOB_PROBLEM, type ScheduledJob } from "../types"
import { RecipientsInput } from "./RecipientsInput"

type Props = { job: ScheduledJob; open: boolean; onOpenChange: (open: boolean) => void }

const PREVIEW_DEBOUNCE_MS = 400

const NUMBER_FIELDS = [
  { name: "timeout_seconds", limits: JOB_LIMITS.timeoutSeconds },
  { name: "max_attempts", limits: JOB_LIMITS.maxAttempts },
  { name: "retry_backoff_seconds", limits: JOB_LIMITS.retryBackoffSeconds },
] as const

/** Returns `value` once it has been stable for `delay` ms. */
function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(handle)
  }, [value, delay])
  return debounced
}

export function JobEditDialog({ job, open, onOpenChange }: Props) {
  const { t, locale } = useI18n()
  const ns = "platform.scheduled_jobs"
  const update = useUpdateJob()
  const reloadJobs = useReloadJobs()
  const [conflict, setConflict] = useState(false)

  const schema = useMemo(() => buildJobConfigSchema(t), [t])
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
    setValue,
  } = useForm<JobConfigFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toJobConfigFormValues(job),
  })

  const cronExpr = useWatch({ control, name: "cron_expr" })
  const timezone = useWatch({ control, name: "timezone" })
  const debounced = useDebounced({ cron: cronExpr.trim(), tz: timezone.trim() }, PREVIEW_DEBOUNCE_MS)
  const preview = useCronPreview(debounced.cron, debounced.tz, open)
  const previewRuns = preview.data?.next_runs ?? []
  const previewError = preview.isError ? translateApiError(preview.error) : null
  const cronDescription = humanCron(cronExpr, t)

  const busy = isSubmitting || update.isPending

  const submit = handleSubmit((values) =>
    update.mutate(
      { code: job.code, body: toJobConfigUpdate(values, job.version) },
      {
        onSuccess: () => {
          notify.success(t(`${ns}.saved`, { name: job.name }))
          onOpenChange(false)
        },
        onError: (error) => {
          const code = apiErrorCode(error)
          if (code === JOB_PROBLEM.invalidSchedule) {
            setError("cron_expr", { type: "server", message: translateApiError(error) })
            return
          }
          if (code === JOB_PROBLEM.versionConflict) {
            setConflict(true)
            return
          }
          notify.error(t(`${ns}.save_failed`), translateApiError(error))
        },
      }
    )
  )

  const reloadAndClose = () => {
    void reloadJobs()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t(`${ns}.edit_title`, { name: job.name })}</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs">{job.code}</span> · {job.owner_service} ·{" "}
            <span className="font-mono text-xs">{job.path}</span>
          </DialogDescription>
        </DialogHeader>
        <form id={`job-edit-${job.code}`} onSubmit={submit} noValidate>
          <DialogBody className="grid gap-4 py-1">
            {conflict && (
              <Alert variant="destructive" data-testid="version-conflict">
                <AlertTitle>{t(`${ns}.conflict.title`)}</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                  <span>{t(`${ns}.conflict.body`)}</span>
                  <Button type="button" size="sm" variant="outline" onClick={reloadAndClose}>
                    {t(`${ns}.conflict.reload`)}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <Label htmlFor="job-enabled">{t(`${ns}.field.enabled`)}</Label>
                <p className="text-xs text-muted-foreground">{t(`${ns}.field.enabled_hint`)}</p>
              </div>
              <Controller
                control={control}
                name="enabled"
                render={({ field }) => (
                  <Switch id="job-enabled" checked={field.value} onCheckedChange={field.onChange} disabled={busy} />
                )}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
              <FormField
                label={t(`${ns}.field.cron`)}
                htmlFor="job-cron"
                error={errors.cron_expr?.message ?? previewError ?? undefined}
                description={cronDescription || t(`${ns}.field.cron_hint`)}
              >
                <Input
                  id="job-cron"
                  placeholder="0 6 * * *"
                  autoComplete="off"
                  className="font-mono"
                  disabled={busy}
                  aria-invalid={!!errors.cron_expr || !!previewError}
                  {...register("cron_expr")}
                />
              </FormField>
              <FormField label={t(`${ns}.field.timezone`)} htmlFor="job-tz" error={errors.timezone?.message}>
                <Input id="job-tz" placeholder="Asia/Ho_Chi_Minh" disabled={busy} {...register("timezone")} />
              </FormField>
            </div>

            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="text-muted-foreground">{t(`${ns}.presets.label`)}:</span>
              {CRON_PRESETS.map((preset) => (
                <Button
                  key={preset.key}
                  type="button"
                  size="sm"
                  variant={cronExpr.trim() === preset.cron ? "secondary" : "ghost"}
                  className="h-7 px-2 text-xs"
                  disabled={busy}
                  onClick={() => setValue("cron_expr", preset.cron, { shouldDirty: true, shouldValidate: true })}
                >
                  {t(`${ns}.presets.${preset.key}`)}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant={cronExpr.trim() === "" ? "secondary" : "ghost"}
                className="h-7 px-2 text-xs"
                disabled={busy}
                onClick={() => setValue("cron_expr", "", { shouldDirty: true, shouldValidate: true })}
              >
                {t(`${ns}.manual_only`)}
              </Button>
            </div>

            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs" data-testid="cron-preview">
              {debounced.cron === "" ? (
                <span className="text-muted-foreground">{t(`${ns}.preview_manual`)}</span>
              ) : preview.isPending ? (
                <span className="text-muted-foreground">{t(`${ns}.preview_loading`)}</span>
              ) : previewRuns.length > 0 ? (
                <>
                  <span className="font-medium">{t(`${ns}.preview`, { n: previewRuns.length })}:</span>{" "}
                  <span className="tabular-nums">
                    {previewRuns.map((run) => formatDateTime(run, locale)).join(" · ")}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">{t(`${ns}.preview_none`)}</span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {NUMBER_FIELDS.map(({ name, limits }) => (
                <FormField
                  key={name}
                  label={t(`${ns}.field.${name}`)}
                  htmlFor={`job-${name}`}
                  description={`${limits.min}–${limits.max}`}
                  error={errors[name]?.message}
                >
                  <Input
                    id={`job-${name}`}
                    type="number"
                    inputMode="numeric"
                    min={limits.min}
                    max={limits.max}
                    step={1}
                    disabled={busy}
                    {...register(name, { valueAsNumber: true })}
                  />
                </FormField>
              ))}
            </div>

            <Controller
              control={control}
              name="notify_role_codes"
              render={({ field }) => (
                <RecipientsInput
                  id="job-notify-roles"
                  label={t(`${ns}.field.roles`)}
                  placeholder="SUPER_ADMIN"
                  description={t(`${ns}.recipients.hint`)}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={busy}
                  error={errors.notify_role_codes?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="notify_group_ids"
              render={({ field }) => (
                <RecipientsInput
                  id="job-notify-groups"
                  label={t(`${ns}.field.groups`)}
                  placeholder={t(`${ns}.recipients.group_placeholder`)}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={busy}
                  error={errors.notify_group_ids?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="notify_user_ids"
              render={({ field }) => (
                <RecipientsInput
                  id="job-notify-users"
                  label={t(`${ns}.field.users`)}
                  placeholder={t(`${ns}.recipients.user_placeholder`)}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={busy}
                  error={errors.notify_user_ids?.message}
                />
              )}
            />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              {t("common.action.cancel")}
            </Button>
            <Button type="submit" disabled={busy || conflict || !!previewError}>
              {busy ? t("common.action.saving") : t("common.action.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
