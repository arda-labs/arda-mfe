import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useI18n } from "@workspace/i18n"
import type { User } from "../types"
import { Button } from "@workspace/ui/components/button"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  editUserDefaultValues,
  editUserSchema,
  toEditUserValues,
  type EditUserValues,
} from "../schema"

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSubmit,
  isBusy,
}: {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: EditUserValues) => Promise<void>
  isBusy: boolean
}) {
  const { t } = useI18n()
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    values: user ? toEditUserValues(user) : editUserDefaultValues,
  })

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) reset(editUserDefaultValues)
  }

  const onFormSubmit = handleSubmit(async (values) => {
    await onSubmit(values)
    handleOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("admin.users.edit")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onFormSubmit}>
          <DialogBody className="space-y-3">
            <FormField
              label={t("admin.users.field.username")}
              error={errors.username?.message}
            >
              <Input
                aria-invalid={Boolean(errors.username)}
                {...register("username")}
              />
            </FormField>
            <FormField
              label={t("common.field.email")}
              error={errors.email?.message}
            >
              <Input
                type="email"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label={t("admin.users.field.first_name")}
                error={errors.firstName?.message}
              >
                <Input
                  aria-invalid={Boolean(errors.firstName)}
                  {...register("firstName")}
                />
              </FormField>
              <FormField
                label={t("admin.users.field.last_name")}
                error={errors.lastName?.message}
              >
                <Input
                  aria-invalid={Boolean(errors.lastName)}
                  {...register("lastName")}
                />
              </FormField>
            </div>
            <FormField
              label={t("admin.users.field.nickname")}
              error={errors.nickname?.message}
            >
              <Input
                aria-invalid={Boolean(errors.nickname)}
                {...register("nickname")}
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label={t("admin.users.field.gender")}
                error={errors.gender?.message}
              >
                <Input
                  aria-invalid={Boolean(errors.gender)}
                  {...register("gender")}
                />
              </FormField>
              <FormField
                label={t("admin.users.field.country")}
                error={errors.country?.message}
              >
                <Input
                  aria-invalid={Boolean(errors.country)}
                  {...register("country")}
                />
              </FormField>
            </div>
            <FormField
              label={t("admin.users.field.address")}
              error={errors.address?.message}
            >
              <Input
                aria-invalid={Boolean(errors.address)}
                {...register("address")}
              />
            </FormField>
            <FormField
              label={t("admin.users.field.position")}
              error={errors.position?.message}
            >
              <Input
                aria-invalid={Boolean(errors.position)}
                {...register("position")}
              />
            </FormField>
            <FormField
              label={t("common.field.status")}
              error={errors.status?.message}
            >
              <Input
                aria-invalid={Boolean(errors.status)}
                placeholder="ACTIVE/DISABLED"
                {...register("status", {
                  onChange: (event) => {
                    event.target.value = event.target.value.toUpperCase()
                  },
                })}
              />
            </FormField>
            <FormField
              label={t("admin.users.field.tenant")}
              error={errors.tenantId?.message}
            >
              <Input
                aria-invalid={Boolean(errors.tenantId)}
                {...register("tenantId")}
              />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button
              className="w-full"
              type="submit"
              disabled={isSubmitting || isBusy}
            >
              {t("admin.users.action.save_changes")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
