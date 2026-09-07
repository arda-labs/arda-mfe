import { useMemo } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import type { GeoAdminUnit } from "../../api"
import { platformApi } from "../../api"
import { Button } from "@workspace/ui/components/button"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { MaskInput } from "@workspace/ui/components/mask-input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string

function buildWardSchema(t: TranslateFn) {
  return z.object({
    code: z
      .string()
      .trim()
      .min(1, t("platform.wards.validation.code_required"))
      .max(32, t("platform.wards.validation.code_too_long")),
    name: z
      .string()
      .trim()
      .min(1, t("platform.wards.validation.name_required"))
      .max(255, t("platform.wards.validation.name_too_long")),
    full_name: z
      .string()
      .trim()
      .max(255, t("platform.wards.validation.full_name_too_long"))
      .optional(),
    parent_code: z
      .string()
      .trim()
      .min(1, t("platform.wards.validation.parent_required")),
    unit_type: z
      .string()
      .trim()
      .min(1, t("platform.wards.validation.unit_type_required"))
      .max(64, t("platform.wards.validation.unit_type_too_long")),
    country_code: z
      .string()
      .trim()
      .min(1, t("platform.wards.validation.country_code_required"))
      .max(8, t("platform.wards.validation.country_code_too_long")),
    region_code: z
      .string()
      .trim()
      .max(32, t("platform.wards.validation.region_code_too_long"))
      .optional(),
    effective_from: z.string().trim().optional(),
    effective_to: z.string().trim().optional(),
  })
}

export type WardFormValues = z.infer<ReturnType<typeof buildWardSchema>>

export const wardDefaultValues: WardFormValues = {
  code: "",
  name: "",
  full_name: "",
  parent_code: "",
  unit_type: "ward",
  country_code: "VN",
  region_code: "",
  effective_from: "",
  effective_to: "",
}

function toWardFormValues(item: GeoAdminUnit): WardFormValues {
  return {
    code: item.code,
    name: item.name,
    full_name: item.full_name || "",
    parent_code: item.parent_code || "",
    unit_type: item.unit_type || "ward",
    country_code: item.country_code || "VN",
    region_code: item.region_code || "",
    effective_from: item.effective_from || "",
    effective_to: item.effective_to || "",
  }
}

export function WardFormDialog({
  open,
  onOpenChange,
  editingItem,
  provinces,
  defaultParentCode,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingItem: GeoAdminUnit | null
  provinces: GeoAdminUnit[]
  defaultParentCode?: string
  onSaved: () => Promise<unknown> | void
}) {
  const { t } = useI18n()
  const wardSchema = useMemo(() => buildWardSchema(t), [t])
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<WardFormValues>({
    resolver: zodResolver(wardSchema),
    values: editingItem
      ? toWardFormValues(editingItem)
      : { ...wardDefaultValues, parent_code: defaultParentCode ?? "" },
  })

  const handleDialogOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) reset(wardDefaultValues)
  }

  const submitWard = handleSubmit(async (values) => {
    const isEditing = Boolean(editingItem)
    try {
      await platformApi.upsertGeoAdminUnit({
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        full_name: values.full_name?.trim() || undefined,
        parent_code: values.parent_code,
        level: 2,
        unit_type: values.unit_type.trim(),
        country_code: values.country_code.trim().toUpperCase() || "VN",
        region_code: values.region_code?.trim() || undefined,
        effective_from: values.effective_from || undefined,
        effective_to: values.effective_to || undefined,
        is_active: true,
      })
      notify.success(
        isEditing
          ? t("platform.wards.toast.update_success")
          : t("platform.wards.toast.create_success")
      )
      onOpenChange(false)
      reset(wardDefaultValues)
      await onSaved()
    } catch (err) {
      notify.error(
        t("platform.wards.toast.save_failed"),
        translateApiError(err)
      )
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {editingItem
              ? t("platform.wards.edit")
              : t("platform.wards.create_title")}
          </DialogTitle>
          <DialogDescription>
            {t("platform.wards.dialog_description")}
          </DialogDescription>
        </DialogHeader>
        <form
          autoComplete="off"
          onSubmit={submitWard}
          className="space-y-4 py-2"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label={t("platform.wards.field.code")}
              htmlFor="ward_code"
              error={errors.code?.message}
            >
              <Input
                id="ward_code"
                aria-invalid={Boolean(errors.code)}
                disabled={!!editingItem}
                {...register("code")}
              />
            </FormField>
            <FormField
              label={t("platform.wards.field.name")}
              htmlFor="ward_name"
              error={errors.name?.message}
            >
              <Input
                id="ward_name"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              className="md:col-span-2"
              label={t("platform.wards.field.full_name")}
              htmlFor="ward_full_name"
              error={errors.full_name?.message}
            >
              <Input
                id="ward_full_name"
                aria-invalid={Boolean(errors.full_name)}
                {...register("full_name")}
              />
            </FormField>
            <FormField
              label={t("platform.wards.field.parent")}
              htmlFor="ward_parent"
              error={errors.parent_code?.message}
            >
              <Controller
                control={control}
                name="parent_code"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="ward_parent"
                      aria-invalid={Boolean(errors.parent_code)}
                    >
                      <SelectValue
                        placeholder={t("platform.wards.placeholder.parent")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((province) => (
                        <SelectItem key={province.code} value={province.code}>
                          {province.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <FormField
              label={t("platform.wards.field.unit_type")}
              htmlFor="ward_unit_type"
              error={errors.unit_type?.message}
            >
              <Input
                id="ward_unit_type"
                aria-invalid={Boolean(errors.unit_type)}
                {...register("unit_type")}
              />
            </FormField>
            <FormField
              label={t("platform.wards.field.region_code")}
              htmlFor="ward_region_code"
              error={errors.region_code?.message}
            >
              <Input
                id="ward_region_code"
                aria-invalid={Boolean(errors.region_code)}
                {...register("region_code")}
              />
            </FormField>
            <FormField
              label={t("platform.wards.field.effective_from")}
              htmlFor="ward_effective_from"
              error={errors.effective_from?.message}
            >
              <Controller
                control={control}
                name="effective_from"
                render={({ field }) => (
                  <MaskInput
                    id="ward_effective_from"
                    mask="date"
                    className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                    value={field.value || ""}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </FormField>
            <FormField
              label={t("platform.wards.field.effective_to")}
              htmlFor="ward_effective_to"
              error={errors.effective_to?.message}
            >
              <Controller
                control={control}
                name="effective_to"
                render={({ field }) => (
                  <MaskInput
                    id="ward_effective_to"
                    mask="date"
                    className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                    value={field.value || ""}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </FormField>
          </div>
          <div className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              type="button"
              onClick={() => handleDialogOpenChange(false)}
            >
              {t("common.action.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? t("common.action.saving")
                : t("common.action.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
