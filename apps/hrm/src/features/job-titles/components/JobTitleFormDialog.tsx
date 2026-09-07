import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { hrmApi, type JobTitle } from "../../api"

/** Job title create/edit form values. Code is locked while editing. */
const buildJobTitleSchema = (t: (key: string) => string) =>
  z.object({
    code: z
      .string()
      .trim()
      .min(1, t("hrm.job_titles.validation.code_required"))
      .max(64, t("hrm.job_titles.validation.code_too_long")),
    name: z
      .string()
      .trim()
      .min(1, t("hrm.job_titles.validation.name_required"))
      .max(255, t("hrm.job_titles.validation.name_too_long")),
    description: z
      .string()
      .trim()
      .max(1000, t("hrm.job_titles.validation.description_too_long")),
  })

type JobTitleFormValues = z.infer<ReturnType<typeof buildJobTitleSchema>>

const jobTitleDefaultValues: JobTitleFormValues = {
  code: "",
  name: "",
  description: "",
}

function toFormValues(item: JobTitle): JobTitleFormValues {
  return {
    code: item.code,
    name: item.name,
    description: item.description ?? "",
  }
}

interface JobTitleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present when editing an existing job title; null for create. */
  jobTitle: JobTitle | null
  /** Called after a successful save so the page can refresh its server list. */
  onSaved?: () => void | Promise<void>
}

export function JobTitleFormDialog({
  open,
  onOpenChange,
  jobTitle,
  onSaved,
}: JobTitleFormDialogProps) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const jobTitleSchema = useMemo(() => buildJobTitleSchema(t), [t])
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<JobTitleFormValues>({
    resolver: zodResolver(jobTitleSchema),
    defaultValues: jobTitleDefaultValues,
  })

  useEffect(() => {
    if (open) reset(jobTitle ? toFormValues(jobTitle) : jobTitleDefaultValues)
  }, [jobTitle, open, reset])

  const submit = handleSubmit(async (values) => {
    const payload = {
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
    }
    setSaving(true)
    try {
      if (jobTitle) {
        await hrmApi.updateJobTitle(jobTitle.id, payload)
        notify.success(t("hrm.job_titles.update_success"))
      } else {
        await hrmApi.createJobTitle(payload)
        notify.success(t("hrm.job_titles.create_success"))
      }
      onOpenChange(false)
      await onSaved?.()
    } catch (err) {
      notify.error(t("hrm.job_titles.save_failed"), translateApiError(err))
    } finally {
      setSaving(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {jobTitle
              ? t("hrm.job_titles.edit_title")
              : t("hrm.job_titles.create_title")}
          </DialogTitle>
          <DialogDescription>
            {t("hrm.job_titles.form_description")}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <FormField
            label={t("hrm.job_titles.field.code")}
            error={errors.code?.message}
          >
            <Input
              aria-invalid={Boolean(errors.code)}
              disabled={Boolean(jobTitle)}
              className="font-mono"
              placeholder="KETOAN"
              {...register("code")}
            />
          </FormField>
          <FormField
            label={t("hrm.job_titles.field.name")}
            error={errors.name?.message}
          >
            <Input
              aria-invalid={Boolean(errors.name)}
              placeholder={t("hrm.job_titles.placeholder.name")}
              {...register("name")}
            />
          </FormField>
          <FormField
            label={t("hrm.job_titles.field.description")}
            error={errors.description?.message}
          >
            <Textarea {...register("description")} />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={isSubmitting || saving}>
              {isSubmitting || saving
                ? t("common.action.saving")
                : t("common.action.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
