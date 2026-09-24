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
import { ArrowDown, ArrowUp, Check, ChevronsUpDown, Copy } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { isSequenceColumn, normalizeText, TablePagination, TableSearchInput } from "./table-controls"

type SortState = { index: number; dir: "asc" | "desc" } | null

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const cleaned = value.replace(/\./g, "").replace(",", ".")
    if (cleaned.trim() === "") return null
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function formatCell(value: unknown, column: string): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "boolean") return value ? "true" : "false"
  if (typeof value === "object") return JSON.stringify(value)
  if (typeof value === "number") {
    const isRate = /rate|ratio|percent|%/i.test(column)
    return value.toLocaleString("vi-VN", { maximumFractionDigits: isRate ? 4 : 2 })
  }
  return String(value)
}

// ReportDataTable renders the columns+rows shape returned by the statistical
// tools with client-side search, per-column sorting and pagination — the same
// interaction model EPAS gives its report grids.
export function ReportDataTable({
  columns,
  rows,
  truncated = false,
  totalRows,
}: {
  columns: string[]
  rows: unknown[][]
  truncated?: boolean
  totalRows?: number
}) {
  const { t } = useI18n()
  const [query, setQuery] = useState("")
  const [copied, setCopied] = useState(false)
  const [sort, setSort] = useState<SortState>(null)
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const handleQueryChange = (val: string) => {
    setQuery(val)
    setPage(1)
  }

  const visibleColumns = useMemo(
    () =>
      columns
        .map((label, index) => ({ label, index }))
        .filter(({ label }) => label && !label.startsWith("_")),
    [columns]
  )

  const isFirstColSeq = useMemo(
    () => visibleColumns.length > 0 && isSequenceColumn(visibleColumns[0].label),
    [visibleColumns]
  )

  const colWidths = useMemo(() => {
    return visibleColumns.map(({ label, index }, colIdx) => {
      const isSeq = colIdx === 0 && isFirstColSeq
      if (isSeq) {
        return { isSeq: true, width: 52, minWidth: 52 }
      }
      let maxLen = label.length
      const sample = rows.length > 200 ? rows.slice(0, 200) : rows
      for (const row of sample) {
        const val = row[index]
        if (val != null) {
          const str = String(val)
          if (str.length > maxLen) maxLen = str.length
        }
      }
      const estimated = Math.min(Math.max(maxLen * 8.5 + 36, 100), 360)
      return { isSeq: false, width: estimated, minWidth: estimated }
    })
  }, [visibleColumns, rows, isFirstColSeq])

  const totalColWidth = useMemo(
    () => colWidths.reduce((sum, col) => sum + col.width, 0),
    [colWidths]
  )

  const filtered = useMemo(() => {
    const needle = normalizeText(query)
    if (!needle) return rows
    return rows.filter((row) =>
      row.some((cell) => normalizeText(cell).includes(needle))
    )
  }, [rows, query])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const factor = sort.dir === "asc" ? 1 : -1
    return [...filtered].sort((left, right) => {
      const a = left[sort.index]
      const b = right[sort.index]
      const numA = toNumber(a)
      const numB = toNumber(b)
      if (numA !== null && numB !== null) return (numA - numB) * factor
      return normalizeText(a).localeCompare(normalizeText(b)) * factor
    })
  }, [filtered, sort])

  const total = sorted.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageRows = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize]
  )

  const toggleSort = (index: number) => {
    setSort((current) => {
      if (!current || current.index !== index) return { index, dir: "asc" }
      if (current.dir === "asc") return { index, dir: "desc" }
      return null
    })
  }

  const onCopy = async () => {
    try {
      const colLabels = visibleColumns.map((c) => c.label)
      const lines = [
        colLabels.join("\t"),
        ...rows.map((row) =>
          visibleColumns.map((c) => formatCell(row[c.index], c.label)).join("\t")
        ),
      ]
      await navigator.clipboard.writeText(lines.join("\n"))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  if (visibleColumns.length === 0 || rows.length === 0) return null

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">{t("ai.tool.report.table_title")}</p>
        <div className="flex items-center gap-1.5">
          <TableSearchInput
            value={query}
            onChange={handleQueryChange}
            filteredCount={filtered.length}
            totalCount={rows.length}
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
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/80 bg-card shadow-2xs">
        <Table
          style={{ minWidth: totalColWidth > 0 ? `${totalColWidth}px` : "100%" }}
          className="w-full text-left text-xs table-fixed"
        >
          <colgroup>
            {visibleColumns.map((col, idx) => (
              <col
                key={col.index}
                style={{
                  width: colWidths[idx]?.isSeq ? "52px" : `${colWidths[idx]?.width}px`,
                  minWidth: colWidths[idx]?.isSeq ? "52px" : `${colWidths[idx]?.minWidth}px`,
                }}
              />
            ))}
          </colgroup>
          <TableHeader className="bg-muted/60 text-[11px] uppercase tracking-wider">
            <TableRow>
              {visibleColumns.map(({ label, index }, colIdx) => {
                const isSeq = colIdx === 0 && isFirstColSeq
                const active = sort?.index === index
                return (
                  <TableHead
                    key={`${label}-${index}`}
                    style={{
                      width: isSeq ? "52px" : `${colWidths[colIdx]?.width}px`,
                      minWidth: isSeq ? "52px" : `${colWidths[colIdx]?.minWidth}px`,
                      maxWidth: isSeq ? "56px" : undefined,
                    }}
                    className={cn(
                      "h-auto whitespace-nowrap py-2 text-[11px] font-semibold text-muted-foreground",
                      isSeq ? "w-12 min-w-[48px] max-w-[56px] px-2 text-center" : "px-3.5"
                    )}
                  >
                    {isSeq ? (
                      <span className="block text-center">{label}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleSort(index)}
                        className="inline-flex items-center gap-1 font-semibold hover:text-foreground"
                        title={t("ai.table.sort") || "Sắp xếp"}
                      >
                        {label}
                        {active ? (
                          sort?.dir === "asc" ? (
                            <ArrowUp className="size-3 text-primary" />
                          ) : (
                            <ArrowDown className="size-3 text-primary" />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-40" />
                        )}
                      </button>
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row, rowIndex) => (
              <TableRow key={rowIndex} className="transition-colors even:bg-muted/15 hover:bg-primary/[0.04]">
                {visibleColumns.map(({ label, index }, colIdx) => {
                  const isSeq = colIdx === 0 && isFirstColSeq
                  const val = row[index]
                  const num = toNumber(val)
                  const isRate = /rate|ratio|percent|%/i.test(label)
                  const isDelta = isRate || /growth|change|tăng|giảm/i.test(label)
                  const deltaColor =
                    isDelta && num !== null
                      ? num > 0
                        ? "text-emerald-600 dark:text-emerald-400 font-medium"
                        : num < 0
                          ? "text-rose-600 dark:text-rose-400 font-medium"
                          : ""
                      : ""

                  return (
                    <TableCell
                      key={index}
                      style={{
                        width: isSeq ? "52px" : `${colWidths[colIdx]?.width}px`,
                        minWidth: isSeq ? "52px" : `${colWidths[colIdx]?.minWidth}px`,
                        maxWidth: isSeq ? "56px" : undefined,
                      }}
                      className={cn(
                        "whitespace-nowrap py-2 text-[11px]",
                        isSeq
                          ? "w-12 min-w-[48px] max-w-[56px] px-2 text-center font-mono text-muted-foreground tabular-nums"
                          : "px-3.5",
                        !isSeq && num !== null && "tabular-nums text-right font-mono",
                        deltaColor
                      )}
                    >
                      {formatCell(val, label)}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} className="py-4 text-center text-[11px] text-muted-foreground">
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

      {truncated && (totalRows ?? 0) > rows.length && (
        <p className="px-1 text-[10px] text-muted-foreground">
          {t("ai.table.truncated", { shown: rows.length, total: totalRows ?? rows.length }) ||
            `Hiển thị ${rows.length}/${totalRows} dòng`}
        </p>
      )}
    </div>
  )
}
