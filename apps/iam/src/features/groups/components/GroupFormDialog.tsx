import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { FormField } from "@workspace/ui/components/form-field"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { groupsApi } from "../api"
import type { Group } from "../types"

const buildGroupSchema = (t: (key: string) => string) =>
  z.object({
    code: z
      .string()
      .trim()
      .min(1, t("iam.groups.validation.code_required"))
      .max(128, t("iam.groups.validation.code_too_long")),
    name: z
      .string()
      .trim()
      .min(1, t("iam.groups.validation.name_required"))
      .max(255, t("iam.groups.validation.name_too_long")),
    description: z
      .string()
      .trim()
      .max(1000, t("iam.groups.validation.description_too_long"))
      .optional(),
    status: z.enum(["ACTIVE", "DISABLED"]),
    tenantId: z
      .string()
      .trim()
      .min(1, t("iam.groups.validation.tenant_required")),
  })

type GroupFormValues = z.infer<ReturnType<typeof buildGroupSchema>>

const groupDefaultValues: GroupFormValues = {
  code: "",
  name: "",
  description: "",
  status: "ACTIVE",
  tenantId: "",
}

function toGroupValues(group: Group): GroupFormValues {
  return {
    code: group.code,
    name: group.name,
    description: group.description ?? "",
    status: group.status === "DISABLED" ? "DISABLED" : "ACTIVE",
    tenantId: group.tenantId || "",
  }
}

interface GroupFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present when editing an existing group; null for create. */
  group: Group | null
  /** Called after a successful save so the page can refresh its server list. */
  onSaved?: () => void | Promise<void>
}

export function GroupFormDialog({
  open,
  onOpenChange,
  group,
  onSaved,
}: GroupFormDialogProps) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const groupSchema = useMemo(() => buildGroupSchema(t), [t])
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: groupDefaultValues,
  })

  useEffect(() => {
    if (open) reset(group ? toGroupValues(group) : groupDefaultValues)
  }, [group, open, reset])

  const submit = handleSubmit(async (values) => {
    const payload = {
      name: values.name.trim(),
      description: values.description?.trim() || "",
      status: values.status,
      tenantId: values.tenantId.trim(),
    }
    setSaving(true)
    try {
      if (group) {
        await groupsApi.updateGroup(group.id, payload)
        notify.success(t("admin.groups.update_success"))
      } else {
        await groupsApi.createGroup({ code: values.code.trim(), ...payload })
        notify.success(t("admin.groups.create_success"))
      }
      onOpenChange(false)
      await onSaved?.()
    } catch (err) {
      notify.error(t("admin.groups.save_failed"), translateApiError(err))
    } finally {
      setSaving(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {group ? t("admin.groups.edit") : t("admin.groups.create")}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <FormField label={t("common.field.code")} error={errors.code?.message}>
            <Input
              aria-invalid={Boolean(errors.code)}
              disabled={Boolean(group)}
              {...register("code")}
            />
          </FormField>
          <FormField label={t("common.field.name")} error={errors.name?.message}>
            <Input
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </FormField>
          <FormField
            label={t("admin.groups.field.description")}
            error={errors.description?.message}
          >
            <Textarea
              aria-invalid={Boolean(errors.description)}
              {...register("description")}
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
            disabled={isSubmitting || saving}
          >
            {group ? t("common.action.save") : t("common.action.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
