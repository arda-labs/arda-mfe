import { useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import type { CreditInstitution } from "../../api"
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

function buildCreditInstitutionSchema(t: TranslateFn) {
  const optionalEmailSchema = z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .email(t("platform.credit_institutions.validation.email_invalid")),
  ])

  const optionalUrlSchema = z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .url(t("platform.credit_institutions.validation.website_invalid")),
  ])

  return z.object({
    code: z
      .string()
      .trim()
      .min(1, t("platform.credit_institutions.validation.code_required"))
      .max(64, t("platform.credit_institutions.validation.code_too_long")),
    name: z
      .string()
      .trim()
      .min(1, t("platform.credit_institutions.validation.name_required"))
      .max(255, t("platform.credit_institutions.validation.name_too_long")),
    address: z
      .string()
      .trim()
      .min(1, t("platform.credit_institutions.validation.address_required"))
      .max(500, t("platform.credit_institutions.validation.address_too_long")),
    status: z.enum(["active", "inactive"]),
    effective_from: z.string().trim().optional(),
    short_name: z
      .string()
      .trim()
      .max(
        128,
        t("platform.credit_institutions.validation.short_name_too_long")
      )
      .optional(),
    phone: z
      .string()
      .trim()
      .max(32, t("platform.credit_institutions.validation.phone_too_long"))
      .optional(),
    email: optionalEmailSchema,
    license_no: z
      .string()
      .trim()
      .max(
        128,
        t("platform.credit_institutions.validation.license_no_too_long")
      )
      .optional(),
    license_date: z.string().trim().optional(),
    tax_code: z
      .string()
      .trim()
      .max(64, t("platform.credit_institutions.validation.tax_code_too_long"))
      .optional(),
    website: optionalUrlSchema,
    note: z
      .string()
      .trim()
      .max(500, t("platform.credit_institutions.validation.note_too_long"))
      .optional(),
  })
}

export type CreditInstitutionFormValues =
  z.infer<ReturnType<typeof buildCreditInstitutionSchema>>

export const creditInstitutionDefaultValues: CreditInstitutionFormValues = {
  code: "",
  name: "",
  address: "",
  status: "active",
  effective_from: "",
  short_name: "",
  phone: "",
  email: "",
  license_no: "",
  license_date: "",
  tax_code: "",
  website: "",
  note: "",
}

function toCreditInstitutionFormValues(
  item: CreditInstitution
): CreditInstitutionFormValues {
  return {
    code: item.code,
    name: item.name,
    address: item.address,
    status: item.status,
    effective_from: item.effective_from || "",
    short_name: item.short_name || "",
    phone: item.phone || "",
    email: item.email || "",
    license_no: item.license_no || "",
    license_date: item.license_date || "",
    tax_code: item.tax_code || "",
    website: item.website || "",
    note: item.note || "",
  }
}

export function CreditInstitutionFormDialog({
  open,
  onOpenChange,
  editingItem,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingItem: CreditInstitution | null
  onSaved: () => Promise<unknown> | void
}) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const creditInstitutionSchema = useMemo(
    () => buildCreditInstitutionSchema(t),
    [t]
  )
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<CreditInstitutionFormValues>({
    resolver: zodResolver(creditInstitutionSchema),
    values: editingItem
      ? toCreditInstitutionFormValues(editingItem)
      : creditInstitutionDefaultValues,
  })

  const handleDialogOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) reset(creditInstitutionDefaultValues)
  }

  const submitCreditInstitution = handleSubmit(async (values) => {
    setSaving(true)
    try {
      const payload: Partial<CreditInstitution> = {
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        address: values.address.trim(),
        status: values.status,
        effective_from: values.effective_from || undefined,
        short_name: values.short_name?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        email: values.email.trim() || undefined,
        license_no: values.license_no?.trim() || undefined,
        license_date: values.license_date || undefined,
        tax_code: values.tax_code?.trim() || undefined,
        website: values.website.trim() || undefined,
        note: values.note?.trim() || undefined,
      }

      if (editingItem) {
        await platformApi.updateCreditInstitution(editingItem.id, payload)
        notify.success(t("platform.credit_institutions.toast.update_success"))
      } else {
        await platformApi.createCreditInstitution(payload)
        notify.success(t("platform.credit_institutions.toast.create_success"))
      }

      onOpenChange(false)
      reset(creditInstitutionDefaultValues)
      await onSaved()
    } catch (err) {
      notify.error(
        t("platform.credit_institutions.toast.save_failed"),
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
              ? t("platform.credit_institutions.edit")
              : t("platform.credit_institutions.create_title")}
          </DialogTitle>
          <DialogDescription>
            {t("platform.credit_institutions.dialog_description")}
          </DialogDescription>
        </DialogHeader>

        <form autoComplete="off" onSubmit={submitCreditInstitution} className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label={t("platform.credit_institutions.field.code")}
              htmlFor="credit_code"
              error={errors.code?.message}
            >
              <Input
                id="credit_code"
                placeholder={t("platform.credit_institutions.placeholder.code")}
                aria-invalid={Boolean(errors.code)}
                disabled={!!editingItem}
                {...register("code")}
              />
            </FormField>
            <FormField
              label={t("platform.credit_institutions.field.name")}
              htmlFor="credit_name"
              error={errors.name?.message}
            >
              <Input
                id="credit_name"
                placeholder={t("platform.credit_institutions.placeholder.name")}
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label={t("platform.credit_institutions.field.address")}
              htmlFor="credit_address"
              error={errors.address?.message}
            >
              <Input
                id="credit_address"
                placeholder={t(
                  "platform.credit_institutions.placeholder.address"
                )}
                aria-invalid={Boolean(errors.address)}
                {...register("address")}
              />
            </FormField>
            <FormField
              label={t("platform.credit_institutions.field.status")}
              htmlFor="credit_status"
              error={errors.status?.message}
            >
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="credit_status"
                      aria-invalid={Boolean(errors.status)}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        {t("platform.credit_institutions.status.active")}
                      </SelectItem>
                      <SelectItem value="inactive">
                        {t("platform.credit_institutions.status.inactive")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              label={t("platform.credit_institutions.field.effective_from")}
              htmlFor="credit_effective_from"
              error={errors.effective_from?.message}
            >
              <Controller
                control={control}
                name="effective_from"
                render={({ field }) => (
                  <MaskInput
                    id="credit_effective_from"
                    mask="date"
                    className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                    value={field.value || ""}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </FormField>
            <FormField
              label={t("platform.credit_institutions.field.short_name")}
              htmlFor="credit_short_name"
              error={errors.short_name?.message}
            >
              <Input
                id="credit_short_name"
                aria-invalid={Boolean(errors.short_name)}
                {...register("short_name")}
              />
            </FormField>
            <FormField
              label={t("platform.credit_institutions.field.phone")}
              htmlFor="credit_phone"
              error={errors.phone?.message}
            >
              <Input
                id="credit_phone"
                aria-invalid={Boolean(errors.phone)}
                {...register("phone")}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              label={t("platform.credit_institutions.field.email")}
              htmlFor="credit_email"
              error={errors.email?.message}
            >
              <Input
                id="credit_email"
                type="email"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
            </FormField>
            <FormField
              label={t("platform.credit_institutions.field.license_no")}
              htmlFor="credit_license_no"
              error={errors.license_no?.message}
            >
              <Input
                id="credit_license_no"
                aria-invalid={Boolean(errors.license_no)}
                {...register("license_no")}
              />
            </FormField>
            <FormField
              label={t("platform.credit_institutions.field.license_date")}
              htmlFor="credit_license_date"
              error={errors.license_date?.message}
            >
              <Controller
                control={control}
                name="license_date"
                render={({ field }) => (
                  <MaskInput
                    id="credit_license_date"
                    mask="date"
                    className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                    value={field.value || ""}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              label={t("platform.credit_institutions.field.tax_code")}
              htmlFor="credit_tax_code"
              error={errors.tax_code?.message}
            >
              <Input
                id="credit_tax_code"
                aria-invalid={Boolean(errors.tax_code)}
                {...register("tax_code")}
              />
            </FormField>
            <FormField
              className="md:col-span-2"
              label={t("platform.credit_institutions.field.website")}
              htmlFor="credit_website"
              error={errors.website?.message}
            >
              <Input
                id="credit_website"
                type="url"
                aria-invalid={Boolean(errors.website)}
                {...register("website")}
              />
            </FormField>
          </div>

          <FormField
            label={t("platform.credit_institutions.field.note")}
            htmlFor="credit_note"
            error={errors.note?.message}
          >
            <Textarea
              id="credit_note"
              placeholder={t("platform.credit_institutions.placeholder.note")}
              aria-invalid={Boolean(errors.note)}
              {...register("note")}
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
