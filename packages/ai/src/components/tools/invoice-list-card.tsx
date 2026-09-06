import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import type { ToolResultPayload } from "../../lib/messages"
import type { ToolResultViewProps } from "../../lib/registry"
import { registerToolRenderer } from "../../lib/registry"

type Invoice = {
  id: string
  number: string
  amount: number
  status: "PAID" | "OVERDUE" | "PENDING" | string
  dueDate?: string
}

type InvoiceListResult = {
  invoices: Invoice[]
  totalCount: number
  currency?: string
}

function isInvoiceListResult(result: ToolResultPayload): boolean {
  return (
    Array.isArray(result.invoices) &&
    typeof result.totalCount === "number"
  )
}

export function InvoiceListCard({ result }: ToolResultViewProps) {
  const { t } = useI18n()
  if (!isInvoiceListResult(result)) return null

  const list = result as unknown as InvoiceListResult
  const currency = list.currency || "VND"

  return (
    <div className="mt-3 rounded-lg border bg-card overflow-hidden">
      <div className="px-3 py-2 border-b text-xs font-medium text-muted-foreground flex justify-between items-center">
        <span>
          {t("ai.tool.invoiceList.header", {
            count: list.totalCount,
            currency,
          })}
        </span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-3 py-1.5 text-left font-medium">{t("ai.tool.invoiceList.number")}</th>
            <th className="px-3 py-1.5 text-right font-medium">{t("ai.tool.invoiceList.amount")}</th>
            <th className="px-3 py-1.5 text-center font-medium">{t("ai.tool.invoiceList.status")}</th>
          </tr>
        </thead>
        <tbody>
          {list.invoices.slice(0, 5).map((inv) => (
            <tr key={inv.id || inv.number} className="border-b last:border-0">
              <td className="px-3 py-1.5 font-mono">{inv.number}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {typeof inv.amount === "number" ? inv.amount.toLocaleString("vi-VN") : inv.amount}
              </td>
              <td className="px-3 py-1.5 text-center">
                <Badge
                  variant={
                    inv.status === "PAID"
                      ? "default"
                      : inv.status === "OVERDUE"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {inv.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function registerInvoiceListRenderer() {
  registerToolRenderer({
    id: "crm.invoice-list",
    match: isInvoiceListResult,
    component: InvoiceListCard,
  })
}
