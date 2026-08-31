import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import {
  textValue,
  type ToolResultPayload,
} from "../../lib/messages"
import type { ToolResultViewProps } from "../../lib/registry"
import { registerToolRenderer } from "../../lib/registry"

type CustomerSummary = {
  id: string
  customerCode: string
  name: string
  status: string
  segment?: string
  rank?: string
  riskLevel?: string
}

function isCustomerSummary(result: ToolResultPayload): boolean {
  return (
    typeof result.customerCode === "string" &&
    typeof result.name === "string" &&
    typeof result.id === "string"
  )
}

function toCustomerSummary(result: ToolResultPayload): CustomerSummary {
  return {
    id: textValue(result.id),
    customerCode: textValue(result.customerCode),
    name: textValue(result.name),
    status: textValue(result.status),
    segment: textValue(result.segment) || undefined,
    rank: textValue(result.rank) || undefined,
    riskLevel: textValue(result.riskLevel) || undefined,
  }
}

export function CustomerSummaryCard({ result }: ToolResultViewProps) {
  const { t } = useI18n()
  if (!isCustomerSummary(result)) return null
  const customer = toCustomerSummary(result)

  return (
    <div className="mt-3 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold">{customer.name}</p>
        {customer.status && (
          <Badge variant={customer.status === "ACTIVE" ? "default" : "secondary"}>
            {t("ai.tool.customer.status", { status: customer.status })}
          </Badge>
        )}
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <div>
          <dt className="text-muted-foreground">{t("ai.tool.customer.code")}</dt>
          <dd className="font-medium">{customer.customerCode}</dd>
        </div>
        {customer.segment && (
          <div>
            <dt className="text-muted-foreground">{t("ai.tool.customer.segment")}</dt>
            <dd className="font-medium">{customer.segment}</dd>
          </div>
        )}
        {customer.rank && (
          <div>
            <dt className="text-muted-foreground">{t("ai.tool.customer.rank")}</dt>
            <dd className="font-medium">{customer.rank}</dd>
          </div>
        )}
        {customer.riskLevel && (
          <div>
            <dt className="text-muted-foreground">{t("ai.tool.customer.risk")}</dt>
            <dd className="font-medium">{customer.riskLevel}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}

export function registerCustomerSummaryRenderer() {
  registerToolRenderer({
    id: "arda.customer-summary",
    match: isCustomerSummary,
    component: CustomerSummaryCard,
  })
}
