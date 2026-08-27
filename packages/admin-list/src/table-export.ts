import type { Column, Row, Table } from "@tanstack/react-table"

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
 * Escapes text for XML.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

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
 * Exports table data as Microsoft Excel XML Spreadsheet (.xls).
 */
export function exportTableToExcelXml<TData>(options: TableExportOptions<TData>): void {
  const { table, scope = "all", columnIds, filename = "export.xls", sheetName = "Data" } = options
  const exportable = getExportableColumns(table)
  const columns = columnIds
    ? exportable.filter((c) => columnIds.includes(c.id))
    : exportable.filter((c) => c.isVisible)

  const rows = getExportRows(table, scope)

  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF" ss:FontName="Arial" ss:Size="11"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCell">
   <Font ss:FontName="Arial" ss:Size="10" ss:Color="#0F172A"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="NumberCell">
   <Font ss:FontName="Arial" ss:Size="10" ss:Color="#0F172A"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table ss:DefaultRowHeight="20">
`

  let xmlBody = '   <Row ss:Height="24">\n'
  for (const col of columns) {
    xmlBody += `    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(col.title)}</Data></Cell>\n`
  }
  xmlBody += "   </Row>\n"

  for (const row of rows) {
    xmlBody += '   <Row ss:Height="20">\n'
    for (const col of columns) {
      const rawValue = row.getValue(col.id)
      const { text, type } = formatCellValue(rawValue)
      const styleId = type === "Number" ? "NumberCell" : "DataCell"
      const dataType = type === "Number" ? "Number" : "String"
      xmlBody += `    <Cell ss:StyleID="${styleId}"><Data ss:Type="${dataType}">${escapeXml(text)}</Data></Cell>\n`
    }
    xmlBody += "   </Row>\n"
  }

  const xmlFooter = `  </Table>
 </Worksheet>
</Workbook>`

  const fullXml = xmlHeader + xmlBody + xmlFooter
  const blob = new Blob([fullXml], { type: "application/vnd.ms-excel;charset=utf-8;" })
  const finalFilename = filename.endsWith(".xls") || filename.endsWith(".xlsx") ? filename : `${filename}.xls`

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
