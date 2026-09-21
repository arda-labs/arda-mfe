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
import { tenantsApi } from "../api"
import type { Tenant } from "../types"

const TENANT_STATUSES = ["PROVISIONING", "ACTIVE", "SUSPENDED", "DELETING"]

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
  /** When set the dialog edits this tenant (code is immutable). */
  editing?: Tenant | null
}

export function CreateTenantDialog({
  open,
  onOpenChange,
  onCreated,
  editing,
}: CreateTenantDialogProps) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState("ACTIVE")
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

  useEffect(() => {
    if (!open) return
    if (editing) {
      reset({ code: editing.code, name: editing.name })
      setStatus(editing.status || "ACTIVE")
      return
    }
    reset(initialValues)
    setStatus("ACTIVE")
  }, [open, editing, reset])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset(initialValues)
    onOpenChange(nextOpen)
  }

  const handleCreate = handleSubmit(async (values) => {
    setSaving(true)
    try {
      if (editing) {
        await tenantsApi.updateTenant(editing.id, {
          name: values.name.trim(),
          status,
        })
        notify.success(t("iam.tenants.update_success"))
      } else {
        await tenantsApi.createTenant({
          code: values.code.trim().toLowerCase(),
          name: values.name.trim(),
        })
        notify.success(t("iam.tenants.create_success"))
      }
      onOpenChange(false)
      await onCreated?.()
    } catch (err) {
      notify.error(
        t(
          editing ? "iam.tenants.update_failed" : "iam.tenants.create_failed"
        ),
        translateApiError(err)
      )
    } finally {
      setSaving(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? t("iam.tenants.edit") : t("iam.tenants.create")}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleCreate}>
          <FormField
            label={t("common.field.code")}
            error={errors.code?.message}
          >
            <Input
              aria-invalid={Boolean(errors.code)}
              disabled={Boolean(editing)}
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
          {editing ? (
            <FormField label={t("common.field.status")}>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {TENANT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {t(`iam.tenants.status.${value}`)}
                  </option>
                ))}
              </select>
            </FormField>
          ) : null}
          <Button
            className="w-full"
            type="submit"
            disabled={isSubmitting || saving}
          >
            {editing ? t("common.action.save") : t("common.action.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
