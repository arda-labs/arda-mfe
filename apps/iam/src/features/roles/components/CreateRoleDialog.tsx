import { useState } from "react"
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

const roleCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(64, "Code is too long"),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(255, "Name is too long"),
  tenantId: z.string().trim().min(1, "Tenant is required"),
})

type RoleCreateValues = z.infer<typeof roleCreateSchema>

const initialValues: RoleCreateValues = {
  code: "",
  name: "",
  tenantId: "",
}

interface CreateRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful create so the page can refresh its server list. */
  onCreated?: () => void | Promise<void>
}

export function CreateRoleDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateRoleDialogProps) {
  const { t } = useI18n()
  const [creating, setCreating] = useState(false)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<RoleCreateValues>({
    resolver: zodResolver(roleCreateSchema),
    defaultValues: initialValues,
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset(initialValues)
    onOpenChange(nextOpen)
  }

  const handleCreate = handleSubmit(async (values) => {
    setCreating(true)
    try {
      await rolesApi.createRole(values)
      notify.success("Đã tạo vai trò")
      onOpenChange(false)
      await onCreated?.()
    } catch (err) {
      notify.error("Không tạo được vai trò", translateApiError(err))
    } finally {
      setCreating(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.roles.create")}</DialogTitle>
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
            label={t("admin.groups.field.tenant")}
            error={errors.tenantId?.message}
          >
            <Input
              aria-invalid={Boolean(errors.tenantId)}
              {...register("tenantId")}
            />
          </FormField>
          <Button
            className="w-full"
            type="submit"
            disabled={isSubmitting || creating}
          >
            {t("common.action.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}