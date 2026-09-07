import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { FormField } from "@workspace/ui/components/form-field"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { statisticalApi } from "../../api"
import type { ReportDefinition } from "../../api"

const OUTPUT_FORMATS = ["XLSX", "CSV", "PDF"] as const

const buildDefinitionSchema = (t: (key: string) => string) =>
  z.object({
    code: z
      .string()
      .trim()
      .min(1, t("statistical.validation.code_required"))
      .max(64, t("statistical.validation.code_too_long")),
    name: z
      .string()
      .trim()
      .min(1, t("statistical.validation.name_required"))
      .max(255, t("statistical.validation.name_too_long")),
    group_code: z
      .string()
      .trim()
      .max(64, t("statistical.validation.group_too_long")),
    query_id: z
      .string()
      .trim()
      .min(1, t("statistical.report_definitions.validation.query_required"))
      .max(64, t("statistical.report_definitions.validation.query_too_long")),
    output_format: z.enum(OUTPUT_FORMATS),
  })

type DefinitionFormValues = z.infer<ReturnType<typeof buildDefinitionSchema>>

const definitionDefaultValues: DefinitionFormValues = {
  code: "",
  name: "",
  group_code: "",
  query_id: "",
  output_format: "XLSX",
}

function toDefinitionValues(d: ReportDefinition): DefinitionFormValues {
  return {
    code: d.code,
    name: d.name,
    group_code: d.group_code ?? "",
    query_id: d.query_id,
    output_format: (OUTPUT_FORMATS as readonly string[]).includes(d.output_format)
      ? (d.output_format as DefinitionFormValues["output_format"])
      : "XLSX",
  }
}

interface ReportDefinitionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present when editing an existing definition; null for create. */
  definition: ReportDefinition | null
  /** Called after a successful save so the page can refresh its server list. */
  onSaved?: () => void | Promise<void>
}

/** Create/edit dialog for report definitions (BE upsert by tenant+code). */
export function ReportDefinitionFormDialog({
  open,
  onOpenChange,
  definition,
  onSaved,
}: ReportDefinitionFormDialogProps) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const definitionSchema = useMemo(() => buildDefinitionSchema(t), [t])
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<DefinitionFormValues>({
    resolver: zodResolver(definitionSchema),
    defaultValues: definitionDefaultValues,
  })

  useEffect(() => {
    if (open) reset(definition ? toDefinitionValues(definition) : definitionDefaultValues)
  }, [definition, open, reset])

  const submit = handleSubmit(async (values) => {
    setSaving(true)
    try {
      await statisticalApi.upsertReportDefinition({
        code: values.code.trim(),
        name: values.name.trim(),
        group_code: values.group_code.trim() || undefined,
        query_id: values.query_id.trim(),
        output_format: values.output_format,
        param_schema: definition?.param_schema ?? {},
      })
      notify.success(
        definition
          ? t("statistical.report_definitions.update_success")
          : t("statistical.report_definitions.create_success")
      )
      onOpenChange(false)
      await onSaved?.()
    } catch (err) {
      notify.error(
        t("statistical.report_definitions.save_failed"),
        translateApiError(err, t("statistical.save_failed"))
      )
    } finally {
      setSaving(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {definition
              ? t("statistical.report_definitions.edit")
              : t("statistical.report_definitions.create")}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <FormField label={t("common.field.code")} error={errors.code?.message}>
            <Input
              aria-invalid={Boolean(errors.code)}
              disabled={Boolean(definition)}
              className="font-mono"
              {...register("code")}
            />
          </FormField>
          <FormField
            label={t("statistical.report_definitions.field.name")}
            error={errors.name?.message}
          >
            <Input aria-invalid={Boolean(errors.name)} {...register("name")} />
          </FormField>
          <FormField
            label={t("statistical.indicators.field.group")}
            error={errors.group_code?.message}
          >
            <Input
              aria-invalid={Boolean(errors.group_code)}
              className="font-mono"
              {...register("group_code")}
            />
          </FormField>
          <FormField
            label={t("statistical.report_definitions.field.query_id")}
            error={errors.query_id?.message}
          >
            <Input
              aria-invalid={Boolean(errors.query_id)}
              className="font-mono"
              {...register("query_id")}
            />
          </FormField>
          <FormField
            label={t("statistical.report_definitions.field.output_format")}
            error={errors.output_format?.message}
          >
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              {...register("output_format")}
            >
              {OUTPUT_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </FormField>
          <Button className="w-full" type="submit" disabled={isSubmitting || saving}>
            {definition ? t("common.action.save") : t("common.action.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
