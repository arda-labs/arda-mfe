import { useMemo, useState } from "react"
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
import { tenantsApi } from "../api"

const buildTenantCreateSchema = (t: (key: string) => string) =>
  z.object({
    code: z
      .string()
      .trim()
      .min(1, t("iam.tenants.validation.code_required"))
      .max(128, t("iam.tenants.validation.code_too_long")),
    name: z
      .string()
      .trim()
      .min(1, t("iam.tenants.validation.name_required"))
      .max(255, t("iam.tenants.validation.name_too_long")),
  })

type TenantCreateValues = z.infer<ReturnType<typeof buildTenantCreateSchema>>

const initialValues: TenantCreateValues = {
  code: "",
  name: "",
}

type CreateTenantDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful create so the page can refresh its server list. */
  onCreated?: () => void | Promise<void>
}

export function CreateTenantDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateTenantDialogProps) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const tenantCreateSchema = useMemo(() => buildTenantCreateSchema(t), [t])
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<TenantCreateValues>({
    resolver: zodResolver(tenantCreateSchema),
    defaultValues: initialValues,
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset(initialValues)
    onOpenChange(nextOpen)
  }

  const handleCreate = handleSubmit(async (values) => {
    setSaving(true)
    try {
      await tenantsApi.createTenant({
        code: values.code.trim().toLowerCase(),
        name: values.name.trim(),
      })
      notify.success(t("iam.tenants.create_success"))
      onOpenChange(false)
      await onCreated?.()
    } catch (err) {
      notify.error(t("iam.tenants.create_failed"), translateApiError(err))
    } finally {
      setSaving(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("iam.tenants.create")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleCreate}>
          <FormField
            label={t("common.field.code")}
            error={errors.code?.message}
          >
            <Input
              aria-invalid={Boolean(errors.code)}
              placeholder={t("iam.tenants.field.code_placeholder")}
              {...register("code", {
                onChange: (event) => {
                  event.target.value = event.target.value
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                },
              })}
            />
          </FormField>
          <FormField
            label={t("common.field.name")}
            error={errors.name?.message}
          >
            <Input
              aria-invalid={Boolean(errors.name)}
              placeholder={t("iam.tenants.field.name_placeholder")}
              {...register("name")}
            />
          </FormField>
          <Button
            className="w-full"
            type="submit"
            disabled={isSubmitting || saving}
          >
            {t("common.action.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
