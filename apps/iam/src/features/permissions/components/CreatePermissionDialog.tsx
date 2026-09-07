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
import { permissionsApi } from "../api"

const buildPermissionCreateSchema = (t: (key: string) => string) =>
  z.object({
    code: z
      .string()
      .trim()
      .min(1, t("iam.permissions.validation.code_required"))
      .max(128, t("iam.permissions.validation.code_too_long")),
    name: z
      .string()
      .trim()
      .min(1, t("iam.permissions.validation.name_required"))
      .max(255, t("iam.permissions.validation.name_too_long")),
    module: z
      .string()
      .trim()
      .min(1, t("iam.permissions.validation.module_required"))
      .max(64, t("iam.permissions.validation.module_too_long")),
    resource: z
      .string()
      .trim()
      .min(1, t("iam.permissions.validation.resource_required"))
      .max(64, t("iam.permissions.validation.resource_too_long")),
    operation: z
      .string()
      .trim()
      .min(1, t("iam.permissions.validation.operation_required"))
      .max(64, t("iam.permissions.validation.operation_too_long")),
  })

type PermissionCreateValues = z.infer<
  ReturnType<typeof buildPermissionCreateSchema>
>

const initialValues: PermissionCreateValues = {
  code: "",
  name: "",
  module: "",
  resource: "",
  operation: "",
}

type CreatePermissionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful create so the page can refresh its server list. */
  onCreated?: () => void | Promise<void>
}

export function CreatePermissionDialog({
  open,
  onOpenChange,
  onCreated,
}: CreatePermissionDialogProps) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const permissionCreateSchema = useMemo(
    () => buildPermissionCreateSchema(t),
    [t]
  )
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<PermissionCreateValues>({
    resolver: zodResolver(permissionCreateSchema),
    defaultValues: initialValues,
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset(initialValues)
    onOpenChange(nextOpen)
  }

  const handleCreate = handleSubmit(async (values) => {
    setSaving(true)
    try {
      await permissionsApi.createPermission(values)
      notify.success(t("iam.permissions.create_success"))
      onOpenChange(false)
      await onCreated?.()
    } catch (err) {
      notify.error(t("iam.permissions.create_failed"), translateApiError(err))
    } finally {
      setSaving(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.permissions.create")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleCreate}>
          <FormField
            label={t("common.field.code")}
            error={errors.code?.message}
          >
            <Input
              aria-invalid={Boolean(errors.code)}
              {...register("code")}
            />
          </FormField>
          <FormField
            label={t("common.field.name")}
            error={errors.name?.message}
          >
            <Input
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </FormField>
          <FormField
            label={t("admin.field.module")}
            error={errors.module?.message}
          >
            <Input
              aria-invalid={Boolean(errors.module)}
              {...register("module")}
            />
          </FormField>
          <FormField
            label={t("common.field.resource")}
            error={errors.resource?.message}
          >
            <Input
              aria-invalid={Boolean(errors.resource)}
              {...register("resource")}
            />
          </FormField>
          <FormField
            label={t("common.field.operation")}
            error={errors.operation?.message}
          >
            <Input
              aria-invalid={Boolean(errors.operation)}
              {...register("operation")}
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
