import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { ChevronDown, Table as TableIcon } from "lucide-react"

export function isArrayResult(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && value[0] !== null
}

export function DataTableView({
  data,
  maxInitialRows = 5,
  title,
}: {
  data: Array<Record<string, unknown>>
  maxInitialRows?: number
  title?: string
}) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)

  if (!isArrayResult(data)) return null

  // Extract columns from first object keys
  const columns = Object.keys(data[0]).filter((key) => !key.startsWith("_"))
  const visibleRows = expanded ? data : data.slice(0, maxInitialRows)
  const hasMore = data.length > maxInitialRows

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-2xs overflow-hidden text-xs">
      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <TableIcon className="size-3.5 text-primary" />
          <span>{title || t("ai.table.result_title", { count: data.length }) || `Dữ liệu (${data.length} bản ghi)`}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b bg-muted/40 text-[11px] font-medium text-muted-foreground">
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 capitalize">
                  {formatColumnName(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {visibleRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 text-foreground font-mono text-[11px]">
                    {formatCellValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="border-t bg-muted/20 px-3 py-1.5 text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-6 gap-1 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            <span>
              {expanded
                ? (t("ai.table.show_less") || "Thu gọn")
                : (t("ai.table.show_more", { count: data.length - maxInitialRows }) || `Xem thêm ${data.length - maxInitialRows} bản ghi`)}
            </span>
            <ChevronDown className={`size-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </Button>
        </div>
      )}
    </div>
  )
}

function formatColumnName(col: string): string {
  return col.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())
}

function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return "—"
  if (typeof val === "boolean") return val ? "true" : "false"
  if (typeof val === "object") return JSON.stringify(val)
  return String(val)
}
