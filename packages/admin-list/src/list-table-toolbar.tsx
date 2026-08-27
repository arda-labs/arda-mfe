import { useState, type ReactNode } from "react"
import type { Table } from "@tanstack/react-table"
import { FileSpreadsheet, Plus } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { DataTableToolbar } from "@workspace/ui/components/data-table/data-table-toolbar"
import { TableExportDialog } from "./table-export-dialog"
import type { ExportFormat, ExportScope } from "./table-export"

type ListTableToolbarProps<TData> = {
  table: Table<TData>
  onCreate?: () => void
  createLabel?: string
  children?: ReactNode
  exportFilename?: string
  sheetName?: string
  reportTitle?: string
  totalRowsCount?: number
  fetchAllRows?: (
    onProgress?: (loaded: number, total: number) => void,
    signal?: AbortSignal
  ) => Promise<TData[]>
  createExportJob?: (options: {
    scope: ExportScope
    format: ExportFormat
    columnIds: string[]
    filename: string
    totalCount: number
  }) => Promise<{ jobId: string; message?: string }>
  onExport?: () => void
  onServerExport?: (options: {
    scope: ExportScope
    format: ExportFormat
    columnIds: string[]
    filename: string
  }) => Promise<void>
}

export function ListTableToolbar<TData>({
  table,
  onCreate,
  createLabel,
  children,
  exportFilename,
  sheetName,
  reportTitle,
  totalRowsCount,
  fetchAllRows,
  createExportJob,
  onExport,
  onServerExport,
}: ListTableToolbarProps<TData>) {
  const { t } = useI18n()
  const [exportOpen, setExportOpen] = useState(false)

  const handleExportClick = () => {
    if (onExport) {
      onExport()
    } else {
      setExportOpen(true)
    }
  }

  return (
    <>
      <DataTableToolbar table={table}>
        {children}
        {onCreate && createLabel ? (
          <Button onClick={onCreate} className="h-8 px-3 text-xs font-semibold">
            <Plus className="mr-1 size-3.5" />
            {createLabel}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-8 px-3 text-xs font-semibold border-emerald-600/30 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 hover:border-emerald-600/50 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/40 transition-colors shadow-xs"
          onClick={handleExportClick}
        >
          <FileSpreadsheet className="mr-1.5 size-3.5 text-emerald-600 dark:text-emerald-400" />
          {t("action.export_excel")}
        </Button>
      </DataTableToolbar>

      <TableExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        table={table}
        filename={exportFilename}
        sheetName={sheetName}
        reportTitle={reportTitle}
        totalRowsCount={totalRowsCount}
        fetchAllRows={fetchAllRows}
        createExportJob={createExportJob}
        onServerExport={onServerExport}
      />
    </>
  )
}
