import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { hrmApi, type OrgUnit, type PlatformOrganization } from "../../api"
import { fieldClass } from "../../shared/schemas"

/** Org unit create/edit form values. Code is locked while editing. */
const buildOrgUnitSchema = (t: (key: string) => string) =>
  z.object({
    code: z
      .string()
      .trim()
      .min(1, t("hrm.org_units.validation.code_required"))
      .max(64, t("hrm.org_units.validation.code_too_long")),
    organization_id: z
      .string()
      .trim()
      .min(1, t("hrm.org_units.validation.organization_required")),
    name: z
      .string()
      .trim()
      .min(1, t("hrm.org_units.validation.name_required"))
      .max(255, t("hrm.org_units.validation.name_too_long")),
    org_level: z
      .string()
      .trim()
      .min(1, t("hrm.org_units.validation.org_level_required")),
    parent_id: z.string().trim(),
    department_type: z
      .string()
      .trim()
      .min(1, t("hrm.org_units.validation.department_type_required")),
    status: z.enum(["active", "inactive"]),
    description: z
      .string()
      .trim()
      .max(1000, t("hrm.org_units.validation.description_too_long")),
  })

type OrgUnitFormValues = z.infer<ReturnType<typeof buildOrgUnitSchema>>

const orgUnitDefaultValues: OrgUnitFormValues = {
  code: "",
  organization_id: "",
  name: "",
  org_level: "",
  parent_id: "",
  department_type: "",
  status: "active",
  description: "",
}

function toFormValues(item: OrgUnit): OrgUnitFormValues {
  return {
    code: item.code,
    organization_id: item.organization_id,
    name: item.name,
    org_level: item.org_level,
    parent_id: item.parent_id ?? "",
    department_type: item.department_type,
    status: item.status === "inactive" ? "inactive" : "active",
    description: item.description ?? "",
  }
}

interface OrgUnitFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present when editing an existing org unit; null for create. */
  orgUnit: OrgUnit | null
  /** Platform organizations lookup (client fetch kept as-is per standard). */
  organizations: PlatformOrganization[]
  /** Full org-unit list for the parent selector (client lookup). */
  orgUnits: OrgUnit[]
  /** Called after a successful save so the page can refresh its server list. */
  onSaved?: () => void | Promise<void>
}

export function OrgUnitFormDialog({
  open,
  onOpenChange,
  orgUnit,
  organizations,
  orgUnits,
  onSaved,
}: OrgUnitFormDialogProps) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const orgUnitSchema = useMemo(() => buildOrgUnitSchema(t), [t])
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<OrgUnitFormValues>({
    resolver: zodResolver(orgUnitSchema),
    defaultValues: orgUnitDefaultValues,
  })

  useEffect(() => {
    if (open) reset(orgUnit ? toFormValues(orgUnit) : orgUnitDefaultValues)
  }, [orgUnit, open, reset])

  const submit = handleSubmit(async (values) => {
    const payload = {
      code: values.code.trim(),
      organization_id: values.organization_id.trim(),
      name: values.name.trim(),
      org_level: values.org_level.trim(),
      parent_id: values.parent_id || undefined,
      department_type: values.department_type.trim(),
      status: values.status,
      description: values.description?.trim() || undefined,
    }
    setSaving(true)
    try {
      if (orgUnit) {
        await hrmApi.updateOrgUnit(orgUnit.id, payload)
        notify.success(t("hrm.org_units.update_success"))
      } else {
        await hrmApi.createOrgUnit(payload)
        notify.success(t("hrm.org_units.create_success"))
      }
      onOpenChange(false)
      await onSaved?.()
    } catch (err) {
      notify.error(t("hrm.org_units.save_failed"), translateApiError(err))
    } finally {
      setSaving(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {orgUnit
              ? t("hrm.org_units.edit_title")
              : t("hrm.org_units.create_title")}
          </DialogTitle>
          <DialogDescription>
            {t("hrm.org_units.form_description")}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <FormField
            label={t("hrm.org_units.field.code")}
            error={errors.code?.message}
          >
            <Input
              aria-invalid={Boolean(errors.code)}
              disabled={Boolean(orgUnit)}
              className="font-mono"
              {...register("code")}
            />
          </FormField>
          <FormField
            label={t("hrm.org_units.field.organization")}
            error={errors.organization_id?.message}
          >
            <select className={fieldClass} {...register("organization_id")}>
              <option value="">
                {t("hrm.org_units.select.organization")}
              </option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.code} - {org.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label={t("hrm.org_units.field.name")}
            error={errors.name?.message}
          >
            <Input aria-invalid={Boolean(errors.name)} {...register("name")} />
          </FormField>
          <FormField
            label={t("hrm.org_units.field.org_level")}
            error={errors.org_level?.message}
          >
            <Input
              aria-invalid={Boolean(errors.org_level)}
              placeholder="HOI_SO, PHONG, TO"
              {...register("org_level")}
            />
          </FormField>
          <FormField label={t("hrm.org_units.field.parent")}>
            <select className={fieldClass} {...register("parent_id")}>
              <option value="">{t("hrm.org_units.select.no_parent")}</option>
              {orgUnits
                .filter((item) => item.id !== orgUnit?.id)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} - {item.name}
                  </option>
                ))}
            </select>
          </FormField>
          <FormField
            label={t("hrm.org_units.field.department_type")}
            error={errors.department_type?.message}
          >
            <Input
              aria-invalid={Boolean(errors.department_type)}
              placeholder="PHONG_BAN"
              {...register("department_type")}
            />
          </FormField>
          <FormField
            label={t("hrm.org_units.field.status")}
            error={errors.status?.message}
          >
            <select className={fieldClass} {...register("status")}>
              <option value="active">{t("hrm.status.active")}</option>
              <option value="inactive">{t("hrm.status.inactive")}</option>
            </select>
          </FormField>
          <FormField
            label={t("hrm.org_units.field.description")}
            error={errors.description?.message}
          >
            <Textarea {...register("description")} />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
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
