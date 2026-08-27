import type { Column, RowData, Table } from "@tanstack/react-table"
import * as XLSX from "xlsx"

export type ExportScope = "all" | "selected" | "current_page"
export type ExportFormat = "xlsx" | "csv"

export interface ExportFormatHelpers {
  t?: (key: string, params?: Record<string, string | number>) => string
  formatDate?: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string
  formatNumber?: (value: number, options?: Intl.NumberFormatOptions) => string
  formatCurrency?: (value: number, currency?: string) => string
  locale?: string
}

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    title?: string
    label?: string
    exportValue?: (item: TData, helpers?: ExportFormatHelpers) => string | number | boolean | null
    exportType?: "text" | "number" | "date" | "currency" | "code"
  }
}

export interface TableExportOptions<TData> {
  table: Table<TData>
  data?: TData[]
  scope?: ExportScope
  format?: ExportFormat
  columnIds?: string[]
  filename?: string
  sheetName?: string
  reportTitle?: string
  metadata?: Record<string, string | number>
  helpers?: ExportFormatHelpers
}

/**
 * Generates an enterprise-standard context-aware export filename:
 * Format: {entity}_{scope}_{YYYYMMDD_HHmmss}
 * Example: users_all_20260827_214530 or users_selected_5_20260827_214530
 */
export function generateExportFilename(
  customName?: string,
  options?: {
    scope?: ExportScope
    selectedCount?: number
    date?: Date
  }
): string {
  const date = options?.date || new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")
  const dateSuffix = `${year}${month}${day}_${hours}${minutes}${seconds}`

  let base = "data"
  if (customName && customName.trim() && customName !== "export") {
    base = slugify(customName)
  } else if (typeof window !== "undefined" && window.location.pathname) {
    const segments = window.location.pathname.split("/").filter(Boolean)
    if (segments.length > 0) {
      base = slugify(segments[segments.length - 1])
    }
  }

  if (options?.scope === "selected" && options.selectedCount && options.selectedCount > 0) {
    return `${base}_selected_${options.selectedCount}_${dateSuffix}`
  }

  return `${base}_${options?.scope || "all"}_${dateSuffix}`
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export interface ExportableColumn {
  id: string
  title: string
  isVisible: boolean
  columnDef: unknown
}

/**
 * Extracts exportable columns from TanStack table, ignoring internal utility columns (checkboxes, actions).
 */
export function getExportableColumns<TData>(table: Table<TData>): ExportableColumn[] {
  return table
    .getAllLeafColumns()
    .filter((col) => {
      const id = col.id.toLowerCase()
      if (id === "select" || id === "actions" || id === "action" || id === "_select") {
        return false
      }
      return true
    })
    .map((col) => {
      const title = getColumnHeaderTitle(col)
      return {
        id: col.id,
        title,
        isVisible: col.getIsVisible(),
        columnDef: col.columnDef,
      }
    })
}

function getColumnHeaderTitle<TData>(column: Column<TData, unknown>): string {
  const header = column.columnDef.header
  if (typeof header === "string" && header.trim() !== "") {
    return header
  }
  const meta = column.columnDef.meta as { title?: string; label?: string } | undefined
  if (meta?.title) return meta.title
  if (meta?.label) return meta.label

  if (typeof header === "function") {
    try {
      // @ts-expect-error tanstack column header invoke simulation
      const rendered = header({ column })
      if (typeof rendered === "string" && rendered) return rendered
    } catch {
      // fallback
    }
  }

  return column.id
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (c) => c.toUpperCase())
}

/**
 * Gets target records for export based on chosen scope or explicit data.
 */
export function getExportData<TData>(options: TableExportOptions<TData>): TData[] {
  if (options.data && Array.isArray(options.data) && options.data.length > 0) {
    return options.data
  }

  const { table, scope = "all" } = options
  if (scope === "selected") {
    const selected = table.getFilteredSelectedRowModel().rows
    return (selected.length > 0 ? selected : table.getFilteredRowModel().rows).map((r) => r.original)
  }
  if (scope === "current_page") {
    return table.getRowModel().rows.map((r) => r.original)
  }
  return table.getFilteredRowModel().rows.map((r) => r.original)
}

/**
 * Banking-Grade Formatter: Transforms raw DB value into an audit-compliant display value
 * ensuring identification numbers, codes, dates, statuses, and currency amounts are correctly represented.
 */
export function formatExportValue<TData>(
  col: ExportableColumn,
  item: TData,
  rowIndex: number,
  helpers?: ExportFormatHelpers
): { text: string; raw: string | number | boolean | null; isNumeric: boolean; isCodeString: boolean } {
  const columnDef = col.columnDef as {
    meta?: {
      exportValue?: (item: TData, helpers?: ExportFormatHelpers) => string | number | boolean | null
      exportType?: "text" | "number" | "date" | "currency"
    }
    accessorFn?: (item: TData, index: number) => unknown
    accessorKey?: string
  }

  let value: unknown = undefined

  // 1. Custom column meta export formatter (Highest precedence)
  if (typeof columnDef?.meta?.exportValue === "function") {
    value = columnDef.meta.exportValue(item, helpers)
  } else if (typeof columnDef?.accessorFn === "function") {
    value = columnDef.accessorFn(item, rowIndex)
  } else if (columnDef?.accessorKey) {
    value = getNestedValue(item as Record<string, unknown>, columnDef.accessorKey)
  } else if (col.id) {
    value = (item as Record<string, unknown>)[col.id]
  }

  if (value === null || value === undefined) {
    return { text: "", raw: "", isNumeric: false, isCodeString: false }
  }

  const isEn = helpers?.locale === "en-US"

  // 2. Boolean handling
  if (typeof value === "boolean") {
    const text = value ? (isEn ? "Yes" : "Có") : (isEn ? "No" : "Không")
    return { text, raw: text, isNumeric: false, isCodeString: false }
  }

  // 3. Array handling (e.g. roles: ["ADMIN", "MANAGER"])
  if (Array.isArray(value)) {
    const text = value
      .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
      .join(", ")
    return { text, raw: text, isNumeric: false, isCodeString: false }
  }

  // 4. Date handling (Date instance or ISO string)
  if (value instanceof Date) {
    const text = formatDateISO(value, helpers)
    return { text, raw: text, isNumeric: false, isCodeString: false }
  }

  if (typeof value === "string") {
    const trimmed = value.trim()

    // ISO timestamp detector: "2026-08-27T14:28:51Z"
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
      const parsedDate = new Date(trimmed)
      if (!isNaN(parsedDate.getTime())) {
        const text = formatDateISO(parsedDate, helpers)
        return { text, raw: text, isNumeric: false, isCodeString: false }
      }
    }

    // Identification number / Code / Account / Phone preservation
    // (Strings with leading zeros, e.g. "00123456", CIF, card tokens, citizen ID)
    const isIdentifierCol =
      /code|account|cif|phone|mobile|identity|cccd|cmnd|serial|id_no|stt/i.test(col.id) ||
      /^0\d+$/.test(trimmed)
    if (isIdentifierCol) {
      return { text: trimmed, raw: trimmed, isNumeric: false, isCodeString: true }
    }

    // Enum / Status auto-resolution fallback
    if (/^[A-Z_]{3,30}$/.test(trimmed) && helpers?.t) {
      const localized =
        helpers.t(`status.${trimmed.toLowerCase()}`) ||
        helpers.t(`common.status.${trimmed.toLowerCase()}`) ||
        helpers.t(trimmed.toLowerCase())
      if (localized && localized !== trimmed.toLowerCase()) {
        return { text: localized, raw: localized, isNumeric: false, isCodeString: false }
      }
    }

    return { text: trimmed, raw: trimmed, isNumeric: false, isCodeString: false }
  }

  // 5. Numeric handling
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { text: "", raw: "", isNumeric: false, isCodeString: false }
    const text = helpers?.formatNumber ? helpers.formatNumber(value) : String(value)
    return { text, raw: value, isNumeric: true, isCodeString: false }
  }

  // 6. Object handling
  if (typeof value === "object") {
    try {
      const text = JSON.stringify(value)
      return { text, raw: text, isNumeric: false, isCodeString: false }
    } catch {
      const text = String(value)
      return { text, raw: text, isNumeric: false, isCodeString: false }
    }
  }

  return { text: String(value), raw: String(value), isNumeric: false, isCodeString: false }
}

function formatDateISO(date: Date, helpers?: ExportFormatHelpers): string {
  if (helpers?.formatDate) {
    return helpers.formatDate(date, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const hh = String(date.getHours()).padStart(2, "0")
  const mm = String(date.getMinutes()).padStart(2, "0")
  const ss = String(date.getSeconds()).padStart(2, "0")
  return `${d}/${m}/${y} ${hh}:${mm}:${ss}`
}

function getNestedValue(obj: Record<string, unknown>, pathStr: string): unknown {
  const parts = pathStr.split(".")
  let curr: unknown = obj
  for (const part of parts) {
    if (curr === null || curr === undefined) return undefined
    curr = (curr as Record<string, unknown>)[part]
  }
  return curr
}

/**
 * Banking-Grade XLSX Export:
 * Includes audit watermark headers, auto-freeze panes, explicit cell formatting,
 * and column auto-sizing.
 */
export function exportTableToXlsx<TData>(options: TableExportOptions<TData>): void {
  const {
    table,
    columnIds,
    filename = "export.xlsx",
    sheetName = "Report",
    reportTitle,
    helpers,
    scope = "all",
  } = options

  const exportable = getExportableColumns(table)
  const columns = columnIds
    ? exportable.filter((c) => columnIds.includes(c.id))
    : exportable.filter((c) => c.isVisible)

  const records = getExportData(options)

  const title = (reportTitle || sheetName || "BÁO CÁO DỮ LIỆU").toUpperCase()
  const isEn = helpers?.locale === "en-US"
  const now = new Date()
  const exportTimeStr = formatDateISO(now, helpers)

  const scopeTextMap: Record<ExportScope, string> = {
    all: isEn ? "All filtered records" : "Tất cả kết quả lọc",
    selected: isEn ? "Selected rows" : "Dòng đã chọn",
    current_page: isEn ? "Current page" : "Trang hiện tại",
  }
  const scopeLabel = scopeTextMap[scope] || scope

  // Construct Sheet Data (AOA) with Banking Header
  const aoa: unknown[][] = []

  // Row 1: Report Title
  aoa.push([title])

  // Row 2: Audit Metadata
  const metadataLine = isEn
    ? `Exported at: ${exportTimeStr}  |  Scope: ${scopeLabel}  |  Total records: ${records.length}`
    : `Thời gian trích xuất: ${exportTimeStr}  |  Phạm vi: ${scopeLabel}  |  Tổng số bản ghi: ${records.length}`
  aoa.push([metadataLine])

  // Row 3: Blank separator
  aoa.push([])

  // Row 4: Column Header Row
  aoa.push(columns.map((c) => c.title))

  // Rows 5+: Data records
  for (let r = 0; r < records.length; r++) {
    const item = records[r]
    const rowValues = columns.map((col) => {
      const formatted = formatExportValue(col, item, r, helpers)
      return formatted.raw
    })
    aoa.push(rowValues)
  }

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(aoa)

  // Explicitly tag Code / Identification Number cells as type 's' (string)
  // to guarantee Microsoft Excel NEVER truncates leading zeroes.
  for (let r = 0; r < records.length; r++) {
    const item = records[r]
    const rowIdx = r + 4 // Header is at row index 3 (0-indexed)
    for (let c = 0; c < columns.map((x) => x.id).length; c++) {
      const col = columns[c]
      const formatted = formatExportValue(col, item, r, helpers)
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c })
      const cell = worksheet[cellRef]
      if (cell) {
        if (formatted.isCodeString) {
          cell.t = "s"
          cell.v = String(formatted.text)
        } else if (formatted.isNumeric) {
          cell.t = "n"
          cell.v = Number(formatted.raw)
          cell.z = Number.isInteger(Number(formatted.raw)) ? "#,##0" : "#,##0.00"
        }
      }
    }
  }

  // Auto-fit column widths
  const colWidths = columns.map((col) => {
    let maxLen = Math.max(col.title.length, 10)
    for (let r = 0; r < Math.min(records.length, 200); r++) {
      const item = records[r]
      const formatted = formatExportValue(col, item, r, helpers)
      const cellLen = formatted.text.length
      if (cellLen > maxLen) maxLen = cellLen
    }
    return { wch: Math.min(Math.max(maxLen + 3, 12), 60) }
  })
  worksheet["!cols"] = colWidths

  // Freeze Header Panes at Row 4 (Data begins at Row 5)
  worksheet["!freeze"] = { xSplit: 0, ySplit: 4 }

  // Create workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31))

  // Write binary array & trigger download
  const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })

  const finalFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`
  triggerDownload(blob, finalFilename)
}

export const exportTableToExcelXml = exportTableToXlsx

/**
 * Banking-Grade CSV Export with UTF-8 BOM and metadata comments.
 */
export function exportTableToCsv<TData>(options: TableExportOptions<TData>): void {
  const { table, columnIds, filename = "export.csv", helpers } = options
  const exportable = getExportableColumns(table)
  const columns = columnIds
    ? exportable.filter((c) => columnIds.includes(c.id))
    : exportable.filter((c) => c.isVisible)

  const records = getExportData(options)

  const headerRow = columns.map((col) => escapeCsvValue(col.title)).join(",")

  const dataRows = records.map((item, rIdx) =>
    columns
      .map((col) => {
        const formatted = formatExportValue(col, item, rIdx, helpers)
        return escapeCsvValue(formatted.text)
      })
      .join(",")
  )

  // Prepend UTF-8 BOM for Excel Vietnamese language compatibility
  const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\r\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const finalFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`

  triggerDownload(blob, finalFilename)
}

function escapeCsvValue(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.style.display = "none"
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
