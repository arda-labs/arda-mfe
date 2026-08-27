import { useState, type ReactNode } from "react"
import type { Table } from "@tanstack/react-table"
import { Download, Plus } from "lucide-react"
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
  onExport?: () => void
  onServerExport?: (options: {
    scope: ExportScope
    format: ExportFormat
    columnIds: string[]
  }) => Promise<void>
}

export function ListTableToolbar<TData>({
  table,
  onCreate,
  createLabel,
  children,
  exportFilename,
  sheetName,
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
          className="h-8 px-3 text-xs font-semibold"
          onClick={handleExportClick}
        >
          <Download className="mr-1 size-3.5" />
          {t("common.action.export_excel")}
        </Button>
      </DataTableToolbar>

      <TableExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        table={table}
        filename={exportFilename}
        sheetName={sheetName}
        onServerExport={onServerExport}
      />
    </>
  )
}
