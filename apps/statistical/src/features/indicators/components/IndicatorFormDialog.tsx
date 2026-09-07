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
import type { Indicator } from "../../api"

const buildIndicatorSchema = (t: (key: string) => string) =>
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
    unit: z
      .string()
      .trim()
      .max(32, t("statistical.validation.unit_too_long")),
    group_code: z
      .string()
      .trim()
      .max(64, t("statistical.validation.group_too_long")),
  })

type IndicatorFormValues = z.infer<ReturnType<typeof buildIndicatorSchema>>

const indicatorDefaultValues: IndicatorFormValues = {
  code: "",
  name: "",
  unit: "",
  group_code: "",
}

function toIndicatorValues(indicator: Indicator): IndicatorFormValues {
  return {
    code: indicator.code,
    name: indicator.name,
    unit: indicator.unit ?? "",
    group_code: indicator.group_code ?? "",
  }
}

interface IndicatorFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present when editing an existing indicator; null for create. */
  indicator: Indicator | null
  /** Called after a successful save so the page can refresh its server list. */
  onSaved?: () => void | Promise<void>
}

/** Create/edit dialog for the indicator catalog (BE upsert by tenant+code). */
export function IndicatorFormDialog({
  open,
  onOpenChange,
  indicator,
  onSaved,
}: IndicatorFormDialogProps) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const indicatorSchema = useMemo(() => buildIndicatorSchema(t), [t])
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<IndicatorFormValues>({
    resolver: zodResolver(indicatorSchema),
    defaultValues: indicatorDefaultValues,
  })

  useEffect(() => {
    if (open) reset(indicator ? toIndicatorValues(indicator) : indicatorDefaultValues)
  }, [indicator, open, reset])

  const submit = handleSubmit(async (values) => {
    setSaving(true)
    try {
      await statisticalApi.upsertIndicator({
        code: values.code.trim(),
        name: values.name.trim(),
        unit: values.unit.trim() || undefined,
        group_code: values.group_code.trim() || undefined,
      })
      notify.success(
        indicator
          ? t("statistical.indicators.update_success")
          : t("statistical.indicators.create_success")
      )
      onOpenChange(false)
      await onSaved?.()
    } catch (err) {
      notify.error(
        t("statistical.indicators.save_failed"),
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
            {indicator
              ? t("statistical.indicators.edit")
              : t("statistical.indicators.create")}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <FormField label={t("common.field.code")} error={errors.code?.message}>
            <Input
              aria-invalid={Boolean(errors.code)}
              disabled={Boolean(indicator)}
              className="font-mono"
              {...register("code")}
            />
          </FormField>
          <FormField label={t("statistical.indicators.field.name")} error={errors.name?.message}>
            <Input aria-invalid={Boolean(errors.name)} {...register("name")} />
          </FormField>
          <FormField label={t("statistical.indicators.field.unit")} error={errors.unit?.message}>
            <Input aria-invalid={Boolean(errors.unit)} {...register("unit")} />
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
          <Button className="w-full" type="submit" disabled={isSubmitting || saving}>
            {indicator ? t("common.action.save") : t("common.action.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
