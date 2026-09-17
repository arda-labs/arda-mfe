import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
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
      <Table className="text-xs">
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-auto py-1.5 text-left font-medium">
              {t("ai.tool.invoiceList.number")}
            </TableHead>
            <TableHead className="h-auto py-1.5 text-right font-medium">
              {t("ai.tool.invoiceList.amount")}
            </TableHead>
            <TableHead className="h-auto py-1.5 text-center font-medium">
              {t("ai.tool.invoiceList.status")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.invoices.slice(0, 5).map((inv) => (
            <TableRow key={inv.id || inv.number} className="last:border-0">
              <TableCell className="px-3 py-1.5 font-mono">
                {inv.number}
              </TableCell>
              <TableCell className="px-3 py-1.5 text-right tabular-nums">
                {typeof inv.amount === "number"
                  ? inv.amount.toLocaleString("vi-VN")
                  : inv.amount}
              </TableCell>
              <TableCell className="px-3 py-1.5 text-center">
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
