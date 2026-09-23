import { useMemo, useState } from "react"
import { useI18n } from "@workspace/i18n"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Table as TableIcon } from "lucide-react"
import { normalizeText, TablePagination, TableSearchInput } from "./table-controls"

export function isArrayResult(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && value[0] !== null
}

export function DataTableView({
  data,
  title,
}: {
  data: Array<Record<string, unknown>>
  title?: string
}) {
  const { t } = useI18n()
  const [query, setQuery] = useState("")
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const columns = useMemo(
    () => (isArrayResult(data) ? Object.keys(data[0]).filter((key) => !key.startsWith("_")) : []),
    [data]
  )

  const filtered = useMemo(() => {
    const needle = normalizeText(query)
    if (!needle) return data
    return data.filter((row) =>
      columns.some((column) => normalizeText(formatCellValue(row[column])).includes(needle))
    )
  }, [data, columns, query])

  const total = filtered.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageRows = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  )

  if (!isArrayResult(data)) return null

  return (
    <div className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xs text-xs">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
          <TableIcon className="size-3.5 shrink-0 text-primary" />
          <span className="truncate">
            {title || t("ai.table.result_title", { count: data.length }) || `Dữ liệu (${data.length} bản ghi)`}
          </span>
        </div>
        <TableSearchInput value={query} onChange={setQuery} className="w-40" />
      </div>

      <div className="overflow-x-auto">
        <Table className="text-left text-xs">
          <TableHeader className="bg-muted/40 text-[11px]">
            <TableRow className="font-medium">
              {columns.map((col) => (
                <TableHead key={col} className="h-auto whitespace-nowrap py-2 text-[11px] capitalize">
                  {formatColumnName(col)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row, idx) => (
              <TableRow key={idx} className="transition-colors hover:bg-muted/20">
                {columns.map((col) => (
                  <TableCell key={col} className="whitespace-nowrap font-mono text-[11px] text-foreground">
                    {formatCellValue(row[col])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-4 text-center text-[11px] text-muted-foreground">
                  {t("ai.table.empty") || "Không có dòng nào khớp"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={safePage}
        pageCount={pageCount}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />
    </div>
  )
}

function formatColumnName(col: string): string {
  return col.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())
}

function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return "—"
  if (typeof val === "boolean") return val ? "true" : "false"
  if (typeof val === "number") return val.toLocaleString("vi-VN", { maximumFractionDigits: 2 })
  if (typeof val === "object") return JSON.stringify(val)
  return String(val)
}
