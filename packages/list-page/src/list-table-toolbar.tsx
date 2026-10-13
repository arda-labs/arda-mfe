import { Suspense, useState, type ReactNode } from "react"
import type { Table } from "@tanstack/react-table"
import { FileSpreadsheet, Plus } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { DataTableToolbar } from "@workspace/ui/components/data-table/data-table-toolbar"
import { lazyWithPreload } from "@workspace/federation-runtime/lazy"
import type { ExportFormat, ExportScope } from "./table-export"

const TableExportDialog = lazyWithPreload(() =>
  import("./table-export-dialog").then((module) => ({ default: module.TableExportDialog }))
)

type ListTableToolbarProps<TData> = {
  table: Table<TData>
  onCreate?: () => void
  createLabel?: string
  children?: ReactNode
  exportFilename?: string
  sheetName?: string
  reportTitle?: string
  totalRowsCount?: number
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
          <Button onClick={onCreate} size="sm" className="h-8 px-3 text-xs font-semibold">
            <Plus className="mr-1 size-3.5" />
            {createLabel}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs font-semibold"
          onClick={handleExportClick}
          onPointerEnter={() => void TableExportDialog.preload()}
          onFocus={() => void TableExportDialog.preload()}
        >
          <FileSpreadsheet className="mr-1.5 size-3.5 text-muted-foreground" />
          {t("action.export_excel")}
        </Button>
      </DataTableToolbar>

      {exportOpen ? <Suspense fallback={<span role="status">{t("common.loading")}</span>}><TableExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        table={table}
        filename={exportFilename}
        sheetName={sheetName}
        reportTitle={reportTitle}
        totalRowsCount={totalRowsCount}
        createExportJob={createExportJob}
        onServerExport={onServerExport}
      /></Suspense> : null}
    </>
  )
}
