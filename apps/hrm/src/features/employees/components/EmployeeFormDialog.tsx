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
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { hrmApi, type Employee } from "../../api"
import { fieldClass } from "../../shared/schemas"

/** Employee create/edit form values. Code is locked while editing. */
const buildEmployeeSchema = (t: (key: string) => string) =>
  z.object({
    employee_code: z
      .string()
      .trim()
      .min(1, t("hrm.employees.validation.code_required"))
      .max(64, t("hrm.employees.validation.code_too_long")),
    full_name: z
      .string()
      .trim()
      .min(1, t("hrm.employees.validation.name_required"))
      .max(255, t("hrm.employees.validation.name_too_long")),
    org_unit_id: z.string().trim(),
    position_id: z.string().trim(),
    job_title_id: z.string().trim(),
    status: z.enum(["active", "inactive"]),
  })

type EmployeeFormValues = {
  employee_code: string
  full_name: string
  org_unit_id: string
  position_id: string
  job_title_id: string
  status: "active" | "inactive"
}

const employeeDefaultValues: EmployeeFormValues = {
  employee_code: "",
  full_name: "",
  org_unit_id: "",
  position_id: "",
  job_title_id: "",
  status: "active",
}

function toFormValues(employee: Employee): EmployeeFormValues {
  return {
    employee_code: employee.employee_code,
    full_name: employee.full_name,
    org_unit_id: employee.org_unit_id ?? "",
    position_id: employee.position_id ?? "",
    job_title_id: employee.job_title_id ?? "",
    status: employee.status === "inactive" ? "inactive" : "active",
  }
}

interface EmployeeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present when editing an existing employee; null for create. */
  employee: Employee | null
  orgUnitOptions: Array<{ id: string; label: string }>
  positionOptions: Array<{ id: string; label: string }>
  jobTitleOptions: Array<{ id: string; label: string }>
  /** Called after a successful save so the page can refresh its server list. */
  onSaved?: () => void | Promise<void>
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  orgUnitOptions,
  positionOptions,
  jobTitleOptions,
  onSaved,
}: EmployeeFormDialogProps) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const employeeSchema = useMemo(() => buildEmployeeSchema(t), [t])
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: employeeDefaultValues,
  })

  useEffect(() => {
    if (open) reset(employee ? toFormValues(employee) : employeeDefaultValues)
  }, [employee, open, reset])

  const submit = handleSubmit(async (values) => {
    const payload = {
      employee_code: values.employee_code.trim(),
      full_name: values.full_name.trim(),
      org_unit_id: values.org_unit_id || undefined,
      position_id: values.position_id || undefined,
      job_title_id: values.job_title_id || undefined,
      status: values.status,
    }
    setSaving(true)
    try {
      if (employee) {
        await hrmApi.updateEmployee(employee.id, payload)
        notify.success(t("hrm.employees.update_success"))
      } else {
        await hrmApi.createEmployee(payload)
        notify.success(t("hrm.employees.create_success"))
      }
      onOpenChange(false)
      await onSaved?.()
    } catch (err) {
      notify.error(t("hrm.employees.save_failed"), translateApiError(err))
    } finally {
      setSaving(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {employee
              ? t("hrm.employees.edit_title")
              : t("hrm.employees.create_title")}
          </DialogTitle>
          <DialogDescription>
            {t("hrm.employees.form_description")}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <FormField
            label={t("hrm.employees.field.employee_code")}
            error={errors.employee_code?.message}
          >
            <Input
              aria-invalid={Boolean(errors.employee_code)}
              disabled={Boolean(employee)}
              className="font-mono"
              {...register("employee_code")}
            />
          </FormField>
          <FormField
            label={t("hrm.employees.field.full_name")}
            error={errors.full_name?.message}
          >
            <Input aria-invalid={Boolean(errors.full_name)} {...register("full_name")} />
          </FormField>
          <FormField
            label={t("hrm.employees.field.department")}
            error={errors.org_unit_id?.message}
          >
            <select className={fieldClass} {...register("org_unit_id")}>
              <option value="">{t("hrm.employees.select.department")}</option>
              {orgUnitOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label={t("hrm.employees.field.position")}
            error={errors.position_id?.message}
          >
            <select className={fieldClass} {...register("position_id")}>
              <option value="">{t("hrm.employees.select.position")}</option>
              {positionOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label={t("hrm.employees.field.job_title")}
            error={errors.job_title_id?.message}
          >
            <select className={fieldClass} {...register("job_title_id")}>
              <option value="">{t("hrm.employees.select.job_title")}</option>
              {jobTitleOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label={t("hrm.employees.field.status")}
            error={errors.status?.message}
          >
            <select className={fieldClass} {...register("status")}>
              <option value="active">{t("hrm.status.active")}</option>
              <option value="inactive">{t("hrm.status.inactive")}</option>
            </select>
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
