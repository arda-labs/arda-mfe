import { useEffect, useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Checkbox } from "@workspace/ui/components/checkbox"
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
import { hrmApi, type Position } from "../../api"
import { fieldClass } from "../../shared/schemas"

/** Position create/edit form values. Code is locked while editing. */
const buildPositionSchema = (t: (key: string) => string) =>
  z.object({
    code: z
      .string()
      .trim()
      .min(1, t("hrm.positions.validation.code_required"))
      .max(64, t("hrm.positions.validation.code_too_long")),
    name: z
      .string()
      .trim()
      .min(1, t("hrm.positions.validation.name_required"))
      .max(255, t("hrm.positions.validation.name_too_long")),
    status: z.enum(["active", "inactive"]),
    is_manager: z.boolean(),
    description: z
      .string()
      .trim()
      .max(1000, t("hrm.positions.validation.description_too_long")),
  })

type PositionFormValues = z.infer<ReturnType<typeof buildPositionSchema>>

const positionDefaultValues: PositionFormValues = {
  code: "",
  name: "",
  status: "active",
  is_manager: false,
  description: "",
}

function toFormValues(item: Position): PositionFormValues {
  return {
    code: item.code,
    name: item.name,
    status: item.status === "inactive" ? "inactive" : "active",
    is_manager: item.is_manager,
    description: item.description ?? "",
  }
}

interface PositionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present when editing an existing position; null for create. */
  position: Position | null
  /** Called after a successful save so the page can refresh its server list. */
  onSaved?: () => void | Promise<void>
}

export function PositionFormDialog({
  open,
  onOpenChange,
  position,
  onSaved,
}: PositionFormDialogProps) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const positionSchema = useMemo(() => buildPositionSchema(t), [t])
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<PositionFormValues>({
    resolver: zodResolver(positionSchema),
    defaultValues: positionDefaultValues,
  })
  const isManager = useWatch({ control, name: "is_manager" })

  useEffect(() => {
    if (open) reset(position ? toFormValues(position) : positionDefaultValues)
  }, [position, open, reset])

  const submit = handleSubmit(async (values) => {
    const payload = {
      code: values.code.trim(),
      name: values.name.trim(),
      status: values.status,
      is_manager: values.is_manager,
      description: values.description?.trim() || undefined,
    }
    setSaving(true)
    try {
      if (position) {
        await hrmApi.updatePosition(position.id, payload)
        notify.success(t("hrm.positions.update_success"))
      } else {
        await hrmApi.createPosition(payload)
        notify.success(t("hrm.positions.create_success"))
      }
      onOpenChange(false)
      await onSaved?.()
    } catch (err) {
      notify.error(t("hrm.positions.save_failed"), translateApiError(err))
    } finally {
      setSaving(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {position
              ? t("hrm.positions.edit_title")
              : t("hrm.positions.create_title")}
          </DialogTitle>
          <DialogDescription>
            {t("hrm.positions.form_description")}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <FormField
            label={t("hrm.positions.field.code")}
            error={errors.code?.message}
          >
            <Input
              aria-invalid={Boolean(errors.code)}
              disabled={Boolean(position)}
              className="font-mono"
              placeholder="GIDO"
              {...register("code")}
            />
          </FormField>
          <FormField
            label={t("hrm.positions.field.name")}
            error={errors.name?.message}
          >
            <Input
              aria-invalid={Boolean(errors.name)}
              placeholder={t("hrm.positions.placeholder.name")}
              {...register("name")}
            />
          </FormField>
          <FormField
            label={t("hrm.positions.field.status")}
            error={errors.status?.message}
          >
            <select className={fieldClass} {...register("status")}>
              <option value="active">{t("hrm.status.active")}</option>
              <option value="inactive">{t("hrm.status.inactive")}</option>
            </select>
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isManager}
              onCheckedChange={(value) =>
                setValue("is_manager", Boolean(value), { shouldDirty: true })
              }
            />
            {t("hrm.positions.field.is_manager")}
          </label>
          <FormField
            label={t("hrm.positions.field.description")}
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
