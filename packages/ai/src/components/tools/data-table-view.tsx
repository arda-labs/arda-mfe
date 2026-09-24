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
import { Check, Copy, Maximize2, Table as TableIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { cn } from "@workspace/ui/lib/utils"
import { isSequenceColumn, normalizeText, TablePagination, TableSearchInput } from "./table-controls"

export function isArrayResult(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && value[0] !== null
}

export function DataTableView({
  data,
  title,
  inDialog = false,
}: {
  data: Array<Record<string, unknown>>
  title?: string
  inDialog?: boolean
}) {
  const { t } = useI18n()
  const [query, setQuery] = useState("")
  const [copied, setCopied] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [pageSize, setPageSize] = useState(inDialog ? 25 : 10)
  const [page, setPage] = useState(1)

  const handleQueryChange = (val: string) => {
    setQuery(val)
    setPage(1)
  }

  const columns = useMemo(
    () => (isArrayResult(data) ? Object.keys(data[0]).filter((key) => !key.startsWith("_")) : []),
    [data]
  )

  const isFirstColSeq = useMemo(
    () => columns.length > 0 && isSequenceColumn(columns[0]),
    [columns]
  )

  const colWidths = useMemo(() => {
    return columns.map((col, colIdx) => {
      const isSeq = colIdx === 0 && isFirstColSeq
      if (isSeq) {
        return { isSeq: true, width: 52, minWidth: 52 }
      }
      let maxLen = formatColumnName(col).length
      const sample = data.length > 200 ? data.slice(0, 200) : data
      for (const row of sample) {
        const val = row[col]
        if (val != null) {
          const str = formatCellValue(val)
          if (str.length > maxLen) maxLen = str.length
        }
      }
      const estimated = Math.min(Math.max(maxLen * 8.5 + 36, 100), 360)
      return { isSeq: false, width: estimated, minWidth: estimated }
    })
  }, [columns, data, isFirstColSeq])

  const totalColWidth = useMemo(
    () => colWidths.reduce((sum, col) => sum + col.width, 0),
    [colWidths]
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

  const onCopy = async () => {
    try {
      const lines = [
        columns.join("\t"),
        ...data.map((row) => columns.map((col) => formatCellValue(row[col])).join("\t")),
      ]
      await navigator.clipboard.writeText(lines.join("\n"))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  if (!isArrayResult(data)) return null

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-2xs text-xs">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
          <TableIcon className="size-3.5 shrink-0 text-primary" />
          <span className="truncate">
            {title || t("ai.table.result_title", { count: data.length }) || `Dữ liệu (${data.length} bản ghi)`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <TableSearchInput
            value={query}
            onChange={handleQueryChange}
            filteredCount={filtered.length}
            totalCount={data.length}
          />
          <button
            type="button"
            onClick={onCopy}
            className="flex h-7 items-center gap-1 rounded-md border border-border/60 bg-card px-2 text-[11px] font-medium text-muted-foreground shadow-2xs transition-colors hover:bg-muted hover:text-foreground"
            title={t("ai.table.copy")}
          >
            {copied ? (
              <>
                <Check className="size-3 text-emerald-500" />
                <span className="text-emerald-500 font-medium">{t("ai.table.copied")}</span>
              </>
            ) : (
              <>
                <Copy className="size-3" />
                <span>{t("ai.table.copy")}</span>
              </>
            )}
          </button>
          {!inDialog && (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="flex h-7 items-center gap-1 rounded-md border border-border/60 bg-card px-2 text-[11px] font-medium text-muted-foreground shadow-2xs transition-colors hover:bg-muted hover:text-foreground"
              title={t("ai.table.expand")}
            >
              <Maximize2 className="size-3" />
              <span className="hidden sm:inline">{t("ai.table.expand")}</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table
          style={{ minWidth: totalColWidth > 0 ? `${totalColWidth}px` : "100%" }}
          className="w-full text-left text-xs table-fixed"
        >
          <colgroup>
            {columns.map((col, idx) => (
              <col
                key={col}
                style={{
                  width: colWidths[idx]?.isSeq ? "52px" : `${colWidths[idx]?.width}px`,
                  minWidth: colWidths[idx]?.isSeq ? "52px" : `${colWidths[idx]?.minWidth}px`,
                }}
              />
            ))}
          </colgroup>
          <TableHeader className="bg-muted/60 text-[11px] uppercase tracking-wider">
            <TableRow className="font-semibold">
              {columns.map((col, colIdx) => {
                const isSeq = colIdx === 0 && isFirstColSeq
                return (
                  <TableHead
                    key={col}
                    style={{
                      width: isSeq ? "52px" : `${colWidths[colIdx]?.width}px`,
                      minWidth: isSeq ? "52px" : `${colWidths[colIdx]?.minWidth}px`,
                      maxWidth: isSeq ? "56px" : undefined,
                    }}
                    className={cn(
                      "h-auto whitespace-nowrap py-2 text-[11px] font-semibold text-muted-foreground capitalize",
                      isSeq ? "w-12 min-w-[48px] max-w-[56px] px-2 text-center" : "px-3.5"
                    )}
                  >
                    {isSeq ? <span className="block text-center">{col}</span> : formatColumnName(col)}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row, idx) => (
              <TableRow key={idx} className="transition-colors even:bg-muted/15 hover:bg-primary/[0.04]">
                {columns.map((col, colIdx) => {
                  const isSeq = colIdx === 0 && isFirstColSeq
                  return (
                    <TableCell
                      key={col}
                      style={{
                        width: isSeq ? "52px" : `${colWidths[colIdx]?.width}px`,
                        minWidth: isSeq ? "52px" : `${colWidths[colIdx]?.minWidth}px`,
                        maxWidth: isSeq ? "56px" : undefined,
                      }}
                      className={cn(
                        "whitespace-nowrap font-mono text-[11px] text-foreground",
                        isSeq ? "w-12 min-w-[48px] max-w-[56px] px-2 text-center text-muted-foreground tabular-nums" : "px-3.5"
                      )}
                    >
                      {formatCellValue(row[col])}
                    </TableCell>
                  )
                })}
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

      {total > 10 && (
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
      )}

      {!inDialog && (
        <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
          <DialogContent className="max-w-7xl w-[96vw] max-h-[92vh] flex flex-col p-4 sm:p-5 overflow-hidden">
            <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/60">
              <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
                <TableIcon className="size-4 text-primary" />
                <span>{title || t("ai.table.fullscreen_title")}</span>
                <span className="font-mono text-xs text-muted-foreground font-normal">
                  ({data.length} {t("ai.table.page_size")})
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto py-2">
              <DataTableView data={data} title={title} inDialog />
            </div>
          </DialogContent>
        </Dialog>
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
  if (typeof val === "number") return val.toLocaleString("vi-VN", { maximumFractionDigits: 2 })
  if (typeof val === "object") return JSON.stringify(val)
  return String(val)
}
