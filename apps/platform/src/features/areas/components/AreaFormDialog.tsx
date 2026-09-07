import { useEffect, useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import type { Area, GeoAdminUnit, LookupValue } from "../../api"
import { platformApi } from "../../api"
import { Button } from "@workspace/ui/components/button"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { MaskInput } from "@workspace/ui/components/mask-input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string

function buildAreaSchema(t: TranslateFn) {
  return z.object({
    code: z
      .string()
      .trim()
      .min(1, t("platform.areas.validation.code_required"))
      .max(64, t("platform.areas.validation.code_too_long")),
    name: z
      .string()
      .trim()
      .min(1, t("platform.areas.validation.name_required"))
      .max(255, t("platform.areas.validation.name_too_long")),
    area_type_code: z
      .string()
      .trim()
      .min(1, t("platform.areas.validation.area_type_required")),
    parent_id: z.string().trim().optional(),
    admin_unit_code: z.string().trim().optional(),
    description: z
      .string()
      .trim()
      .max(500, t("platform.areas.validation.description_too_long"))
      .optional(),
    status: z.enum(["active", "inactive"]),
    effective_from: z.string().trim().optional(),
    effective_to: z.string().trim().optional(),
  })
}

export type AreaFormValues = z.infer<ReturnType<typeof buildAreaSchema>>

export const areaDefaultValues: AreaFormValues = {
  code: "",
  name: "",
  area_type_code: "",
  parent_id: "",
  admin_unit_code: "",
  description: "",
  status: "active",
  effective_from: "",
  effective_to: "",
}

function toAreaFormValues(item: Area): AreaFormValues {
  return {
    code: item.code,
    name: item.name,
    area_type_code: item.area_type_code,
    parent_id: item.parent_id || "",
    admin_unit_code: item.admin_unit_code || "",
    description: item.description || "",
    status: item.status,
    effective_from: item.effective_from || "",
    effective_to: item.effective_to || "",
  }
}

export function AreaFormDialog({
  open,
  onOpenChange,
  editingItem,
  areaTypes,
  adminUnits,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingItem: Area | null
  areaTypes: LookupValue[]
  adminUnits: GeoAdminUnit[]
  onSaved: () => Promise<unknown> | void
}) {
  const { t } = useI18n()
  // Parent candidates: the full area list is a small catalog fetched only
  // while the dialog is open (the main table is server-paged).
  const [parentOptions, setParentOptions] = useState<Area[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    platformApi
      .listAreas()
      .then((result) => {
        if (!cancelled) setParentOptions(result)
      })
      .catch(() => {
        // Non-critical lookup; the parent select stays empty.
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const areaSchema = useMemo(() => buildAreaSchema(t), [t])
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<AreaFormValues>({
    resolver: zodResolver(areaSchema),
    values: editingItem ? toAreaFormValues(editingItem) : areaDefaultValues,
  })

  const handleDialogOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) reset(areaDefaultValues)
  }

  const submitArea = handleSubmit(async (values) => {
    setSaving(true)
    try {
      const payload: Partial<Area> = {
        code: values.code.trim().toUpperCase().replace(/\s+/g, "_"),
        name: values.name.trim(),
        area_type_code: values.area_type_code,
        parent_id: values.parent_id || undefined,
        admin_unit_code: values.admin_unit_code || undefined,
        description: values.description?.trim() || undefined,
        status: values.status,
        effective_from: values.effective_from || undefined,
        effective_to: values.effective_to || undefined,
      }

      if (editingItem) {
        await platformApi.updateArea(editingItem.id, payload)
        notify.success(t("platform.areas.toast.update_success"))
      } else {
        await platformApi.createArea(payload)
        notify.success(t("platform.areas.toast.create_success"))
      }

      onOpenChange(false)
      reset(areaDefaultValues)
      await onSaved()
    } catch (err) {
      notify.error(
        t("platform.areas.toast.save_failed"),
        translateApiError(err)
      )
    } finally {
      setSaving(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {editingItem
              ? t("platform.areas.edit")
              : t("platform.areas.create_title")}
          </DialogTitle>
          <DialogDescription>
            {t("platform.areas.dialog_description")}
          </DialogDescription>
        </DialogHeader>

        <form autoComplete="off" onSubmit={submitArea} className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label={t("platform.areas.field.code")}
              htmlFor="area_code"
              error={errors.code?.message}
            >
              <Input
                id="area_code"
                aria-invalid={Boolean(errors.code)}
                disabled={!!editingItem}
                {...register("code")}
              />
            </FormField>
            <FormField
              label={t("platform.areas.field.name")}
              htmlFor="area_name"
              error={errors.name?.message}
            >
              <Input
                id="area_name"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              label={t("platform.areas.field.area_type")}
              htmlFor="area_type_code"
              error={errors.area_type_code?.message}
            >
              <Controller
                control={control}
                name="area_type_code"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="area_type_code"
                      aria-invalid={Boolean(errors.area_type_code)}
                    >
                      <SelectValue
                        placeholder={t("platform.areas.placeholder.area_type")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {areaTypes.map((item) => (
                        <SelectItem key={item.id} value={item.code}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              label={t("platform.areas.field.parent")}
              htmlFor="area_parent_id"
              error={errors.parent_id?.message}
            >
              <Controller
                control={control}
                name="parent_id"
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger
                      id="area_parent_id"
                      aria-invalid={Boolean(errors.parent_id)}
                    >
                      <SelectValue
                        placeholder={t("platform.areas.placeholder.parent_none")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {t("platform.areas.placeholder.parent_none")}
                      </SelectItem>
                      {parentOptions
                        .filter(
                          (item) => !editingItem || item.id !== editingItem.id
                        )
                        .map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              label={t("platform.areas.field.admin_unit")}
              htmlFor="area_admin_unit_code"
              error={errors.admin_unit_code?.message}
            >
              <Controller
                control={control}
                name="admin_unit_code"
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger
                      id="area_admin_unit_code"
                      aria-invalid={Boolean(errors.admin_unit_code)}
                    >
                      <SelectValue
                        placeholder={t(
                          "platform.areas.placeholder.admin_unit_none"
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {t("platform.areas.placeholder.admin_unit_none")}
                      </SelectItem>
                      {adminUnits.map((item) => (
                        <SelectItem key={item.code} value={item.code}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              label={t("platform.areas.field.status")}
              htmlFor="area_status"
              error={errors.status?.message}
            >
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="area_status"
                      aria-invalid={Boolean(errors.status)}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        {t("platform.areas.status.active")}
                      </SelectItem>
                      <SelectItem value="inactive">
                        {t("platform.areas.status.inactive")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              label={t("platform.areas.field.effective_from")}
              htmlFor="area_effective_from"
              error={errors.effective_from?.message}
            >
              <Controller
                control={control}
                name="effective_from"
                render={({ field }) => (
                  <MaskInput
                    id="area_effective_from"
                    mask="date"
                    className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                    value={field.value || ""}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </FormField>
            <FormField
              label={t("platform.areas.field.effective_to")}
              htmlFor="area_effective_to"
              error={errors.effective_to?.message}
            >
              <Controller
                control={control}
                name="effective_to"
                render={({ field }) => (
                  <MaskInput
                    id="area_effective_to"
                    mask="date"
                    className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                    value={field.value || ""}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </FormField>
          </div>

          <FormField
            label={t("platform.areas.field.description")}
            htmlFor="area_description"
            error={errors.description?.message}
          >
            <Textarea
              id="area_description"
              aria-invalid={Boolean(errors.description)}
              placeholder={t("platform.areas.placeholder.description")}
              {...register("description")}
            />
          </FormField>

          <div className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              type="button"
              onClick={() => handleDialogOpenChange(false)}
            >
              {t("common.action.cancel")}
            </Button>
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
