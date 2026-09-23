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
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { normalizeText, TablePagination, TableSearchInput } from "./table-controls"

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
  const [sort, setSort] = useState<SortState>(null)
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)

  const visibleColumns = useMemo(
    () =>
      columns
        .map((label, index) => ({ label, index }))
        .filter(({ label }) => label && !label.startsWith("_")),
    [columns]
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

  if (visibleColumns.length === 0 || rows.length === 0) return null

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">{t("ai.tool.report.table_title")}</p>
        <TableSearchInput value={query} onChange={setQuery} className="w-44" />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table className="text-left text-xs">
          <TableHeader className="bg-muted/40 text-[11px]">
            <TableRow>
              {visibleColumns.map(({ label, index }) => {
                const active = sort?.index === index
                return (
                  <TableHead key={`${label}-${index}`} className="h-auto whitespace-nowrap py-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => toggleSort(index)}
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
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
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row, rowIndex) => (
              <TableRow key={rowIndex} className="transition-colors hover:bg-muted/20">
                {visibleColumns.map(({ label, index }) => (
                  <TableCell
                    key={index}
                    className={cn(
                      "whitespace-nowrap py-1.5 text-[11px]",
                      toNumber(row[index]) !== null && "tabular-nums"
                    )}
                  >
                    {formatCell(row[index], label)}
                  </TableCell>
                ))}
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

      {truncated && (totalRows ?? 0) > rows.length && (
        <p className="px-1 text-[10px] text-muted-foreground">
          {t("ai.table.truncated", { shown: rows.length, total: totalRows ?? rows.length }) ||
            `Hiển thị ${rows.length}/${totalRows} dòng`}
        </p>
      )}
    </div>
  )
}
