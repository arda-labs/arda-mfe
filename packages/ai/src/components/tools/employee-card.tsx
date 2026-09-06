import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import {
  textValue,
  type ToolResultPayload,
} from "../../lib/messages"
import type { ToolResultViewProps } from "../../lib/registry"
import { registerToolRenderer } from "../../lib/registry"

type EmployeeSummary = {
  id: string
  employeeCode: string
  fullName: string
  status: string
  department?: string
  position?: string
  email?: string
  phone?: string
}

function isEmployeeSummary(result: ToolResultPayload): boolean {
  return (
    typeof result.employeeCode === "string" &&
    typeof result.fullName === "string" &&
    typeof result.id === "string"
  )
}

function toEmployeeSummary(result: ToolResultPayload): EmployeeSummary {
  return {
    id: textValue(result.id),
    employeeCode: textValue(result.employeeCode),
    fullName: textValue(result.fullName),
    status: textValue(result.status),
    department: textValue(result.department) || undefined,
    position: textValue(result.position) || undefined,
    email: textValue(result.email) || undefined,
    phone: textValue(result.phone) || undefined,
  }
}

export function EmployeeCard({ result }: ToolResultViewProps) {
  const { t } = useI18n()
  if (!isEmployeeSummary(result)) return null
  const employee = toEmployeeSummary(result)

  return (
    <div className="mt-3 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold">{employee.fullName}</p>
        {employee.status && (
          <Badge variant={employee.status === "ACTIVE" ? "default" : "secondary"}>
            {t("ai.tool.employee.status", { status: employee.status })}
          </Badge>
        )}
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <div>
          <dt className="text-muted-foreground">{t("ai.tool.employee.code")}</dt>
          <dd className="font-medium">{employee.employeeCode}</dd>
        </div>
        {employee.department && (
          <div>
            <dt className="text-muted-foreground">{t("ai.tool.employee.department")}</dt>
            <dd className="font-medium">{employee.department}</dd>
          </div>
        )}
        {employee.position && (
          <div>
            <dt className="text-muted-foreground">{t("ai.tool.employee.position")}</dt>
            <dd className="font-medium">{employee.position}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}

export function registerEmployeeRenderer() {
  registerToolRenderer({
    id: "hrm.employee-card",
    match: isEmployeeSummary,
    component: EmployeeCard,
  })
}
