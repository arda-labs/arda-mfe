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
import { rolesApi } from "../api"
import type { Role } from "../types"

const buildRoleEditSchema = (t: (key: string) => string) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t("iam.roles.validation.name_required"))
      .max(255, t("iam.roles.validation.name_too_long")),
  })

type RoleEditValues = z.infer<ReturnType<typeof buildRoleEditSchema>>

const initialValues: RoleEditValues = {
  name: "",
}

interface EditRoleDialogProps {
  role: Role | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful update so the page can refresh its server list. */
  onSaved?: () => void | Promise<void>
}

export function EditRoleDialog({
  role,
  open,
  onOpenChange,
  onSaved,
}: EditRoleDialogProps) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const roleEditSchema = useMemo(() => buildRoleEditSchema(t), [t])
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<RoleEditValues>({
    resolver: zodResolver(roleEditSchema),
    defaultValues: initialValues,
  })

  useEffect(() => {
    if (open) reset(role ? { name: role.name } : initialValues)
  }, [open, role, reset])

  const handleSave = handleSubmit(async (values) => {
    if (!role) return
    setSaving(true)
    try {
      // The update API contract only accepts `name`; code and status are
      // immutable on the server.
      await rolesApi.updateRole(role.id, role.tenantId, {
        name: values.name.trim(),
      })
      notify.success(t("iam.roles.update_success"))
      onOpenChange(false)
      await onSaved?.()
    } catch (err) {
      notify.error(t("iam.roles.update_failed"), translateApiError(err))
    } finally {
      setSaving(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("iam.roles.edit")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSave}>
          <FormField label={t("common.field.code")}>
            <Input value={role?.code ?? ""} disabled readOnly />
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
          <Button
            className="w-full"
            type="submit"
            disabled={isSubmitting || saving}
          >
            {t("common.action.save")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
