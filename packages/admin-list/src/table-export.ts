import type { Column, Row, Table } from "@tanstack/react-table"
import * as XLSX from "xlsx"

export type ExportScope = "all" | "selected" | "current_page"
export type ExportFormat = "xlsx" | "csv"

export interface TableExportOptions<TData> {
  table: Table<TData>
  scope?: ExportScope
  format?: ExportFormat
  columnIds?: string[]
  filename?: string
  sheetName?: string
}

/**
 * Generates an enterprise-standard context-aware export filename:
 * Format: {entity}_{scope}_{YYYYMMDD_HHmm}
 * Example: users_export_20260827_1457 or users_selected_5_20260827_1457
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
  const dateSuffix = `${year}${month}${day}_${hours}${minutes}`

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

  return `${base}_export_${dateSuffix}`
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
}

/**
 * Extracts exportable columns from TanStack table, ignoring internal utility columns (checkboxes, actions).
 */
export function getExportableColumns<TData>(table: Table<TData>): ExportableColumn[] {
  return table
    .getAllLeafColumns()
    .filter((col) => {
      const id = col.id.toLowerCase()
      if (id === "select" || id === "actions" || id === "action" || id === "_select" || id === "row-index") {
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

  // Prettify column ID fallback
  return column.id
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (c) => c.toUpperCase())
}

/**
 * Gets target rows for export based on the chosen scope.
 */
export function getExportRows<TData>(table: Table<TData>, scope: ExportScope = "all"): Row<TData>[] {
  if (scope === "selected") {
    const selected = table.getFilteredSelectedRowModel().rows
    return selected.length > 0 ? selected : table.getFilteredRowModel().rows
  }
  if (scope === "current_page") {
    return table.getRowModel().rows
  }
  return table.getFilteredRowModel().rows
}

/**
 * Formats a raw cell value into an export-safe string or number.
 */
function formatCellValue(value: unknown): { text: string; type: "String" | "Number" | "Boolean" } {
  if (value === null || value === undefined) {
    return { text: "", type: "String" }
  }
  if (typeof value === "number") {
    return { text: Number.isFinite(value) ? String(value) : "", type: "Number" }
  }
  if (typeof value === "boolean") {
    return { text: value ? "True" : "False", type: "Boolean" }
  }
  if (value instanceof Date) {
    return { text: value.toISOString().replace("T", " ").substring(0, 19), type: "String" }
  }
  if (typeof value === "object") {
    try {
      return { text: JSON.stringify(value), type: "String" }
    } catch {
      return { text: String(value), type: "String" }
    }
  }
  return { text: String(value).trim(), type: "String" }
}

/**
 * Escapes text for CSV according to RFC 4180.
 */
function escapeCsvValue(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Exports table data as a modern OpenXML Excel spreadsheet (.xlsx).
 */
export function exportTableToXlsx<TData>(options: TableExportOptions<TData>): void {
  const { table, scope = "all", columnIds, filename = "export.xlsx", sheetName = "Sheet1" } = options
  const exportable = getExportableColumns(table)
  const columns = columnIds
    ? exportable.filter((c) => columnIds.includes(c.id))
    : exportable.filter((c) => c.isVisible)

  const rows = getExportRows(table, scope)

  // Build matrix data array of arrays (AOA)
  const matrix: (string | number | boolean | null)[][] = []

  // 1. Header row
  matrix.push(columns.map((c) => c.title))

  // 2. Data rows
  for (const row of rows) {
    const rowValues = columns.map((col) => {
      const raw = row.getValue(col.id)
      if (raw === null || raw === undefined) return ""
      if (typeof raw === "number") return raw
      if (typeof raw === "boolean") return raw ? "True" : "False"
      if (raw instanceof Date) return raw.toISOString().replace("T", " ").substring(0, 19)
      if (typeof raw === "object") {
        try {
          return JSON.stringify(raw)
        } catch {
          return String(raw)
        }
      }
      return String(raw).trim()
    })
    matrix.push(rowValues)
  }

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(matrix)

  // Auto-fit column widths
  const colWidths = columns.map((col, idx) => {
    let maxLen = col.title.length
    for (let r = 1; r < Math.min(matrix.length, 100); r++) {
      const cellVal = String(matrix[r]?.[idx] ?? "")
      if (cellVal.length > maxLen) maxLen = cellVal.length
    }
    return { wch: Math.min(Math.max(maxLen + 4, 12), 50) }
  })
  worksheet["!cols"] = colWidths

  // Create workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31))

  // Write binary array
  const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })

  const finalFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`
  triggerDownload(blob, finalFilename)
}

/**
 * Legacy alias for backwards compatibility.
 */
export const exportTableToExcelXml = exportTableToXlsx

/**
 * Exports table data as a UTF-8 CSV file with BOM.
 */
export function exportTableToCsv<TData>(options: TableExportOptions<TData>): void {
  const { table, scope = "all", columnIds, filename = "export.csv" } = options
  const exportable = getExportableColumns(table)
  const columns = columnIds
    ? exportable.filter((c) => columnIds.includes(c.id))
    : exportable.filter((c) => c.isVisible)

  const rows = getExportRows(table, scope)

  // Header row
  const headerRow = columns.map((col) => escapeCsvValue(col.title)).join(",")

  // Data rows
  const dataRows = rows.map((row) =>
    columns
      .map((col) => {
        const rawValue = row.getValue(col.id)
        const { text } = formatCellValue(rawValue)
        return escapeCsvValue(text)
      })
      .join(",")
  )

  // Prepend UTF-8 BOM for Microsoft Excel Vietnamese language compatibility
  const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\r\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const finalFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`

  triggerDownload(blob, finalFilename)
}

/**
 * Triggers a browser download using an anchor element.
 */
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
