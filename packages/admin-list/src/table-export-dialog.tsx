import * as React from "react"
import type { Table } from "@tanstack/react-table"
import { Download, FileSpreadsheet, FileText } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Label } from "@workspace/ui/components/label"
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  exportTableToCsv,
  exportTableToExcelXml,
  getExportableColumns,
  type ExportFormat,
  type ExportScope,
} from "./table-export"

export interface TableExportDialogProps<TData> {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: Table<TData>
  filename?: string
  sheetName?: string
  /**
   * Optional custom server-side export delegate.
   * If provided, the dialog calls this function instead of client-side download.
   */
  onServerExport?: (options: {
    scope: ExportScope
    format: ExportFormat
    columnIds: string[]
  }) => Promise<void>
}

export function TableExportDialog<TData>({
  open,
  onOpenChange,
  table,
  filename = "export",
  sheetName = "Sheet1",
  onServerExport,
}: TableExportDialogProps<TData>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <TableExportDialogContent
          table={table}
          filename={filename}
          sheetName={sheetName}
          onOpenChange={onOpenChange}
          onServerExport={onServerExport}
        />
      ) : null}
    </Dialog>
  )
}

interface TableExportDialogContentProps<TData> {
  table: Table<TData>
  filename: string
  sheetName: string
  onOpenChange: (open: boolean) => void
  onServerExport?: (options: {
    scope: ExportScope
    format: ExportFormat
    columnIds: string[]
  }) => Promise<void>
}

function TableExportDialogContent<TData>({
  table,
  filename,
  sheetName,
  onOpenChange,
  onServerExport,
}: TableExportDialogContentProps<TData>) {
  const { t } = useI18n()
  const selectedCount = table.getFilteredSelectedRowModel().rows.length
  const totalFilteredCount = table.getFilteredRowModel().rows.length
  const currentPageCount = table.getRowModel().rows.length

  const [scope, setScope] = React.useState<ExportScope>(() =>
    selectedCount > 0 ? "selected" : "all"
  )
  const [format, setFormat] = React.useState<ExportFormat>("xlsx")
  const [isExporting, setIsExporting] = React.useState(false)

  // Columns state initialized from visible columns on mount
  const exportableColumns = React.useMemo(() => getExportableColumns(table), [table])
  const [selectedColumnIds, setSelectedColumnIds] = React.useState<string[]>(() => {
    const visibleCols = exportableColumns.filter((col) => col.isVisible).map((col) => col.id)
    return visibleCols.length > 0 ? visibleCols : exportableColumns.map((c) => c.id)
  })

  const toggleColumn = (columnId: string) => {
    setSelectedColumnIds((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    )
  }

  const selectAllColumns = () => {
    setSelectedColumnIds(exportableColumns.map((col) => col.id))
  }

  const deselectAllColumns = () => {
    setSelectedColumnIds([])
  }

  const handleExport = async () => {
    if (selectedColumnIds.length === 0) {
      notify.warning(t("common.export.select_at_least_one_column") || "Vui lòng chọn ít nhất một cột để xuất.")
      return
    }

    setIsExporting(true)
    try {
      if (onServerExport) {
        await onServerExport({
          scope,
          format,
          columnIds: selectedColumnIds,
        })
      } else {
        const options = {
          table,
          scope,
          format,
          columnIds: selectedColumnIds,
          filename,
          sheetName,
        }

        if (format === "xlsx") {
          exportTableToExcelXml(options)
        } else {
          exportTableToCsv(options)
        }

        notify.success(t("common.export.success") || "Đã xuất dữ liệu thành công.")
      }
      onOpenChange(false)
    } catch (err) {
      notify.error(t("common.export.failed") || "Không thể xuất file dữ liệu", String(err))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DialogContent className="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Download className="size-5 text-primary" />
          {t("common.export.title") || "Xuất Dữ Liệu"}
        </DialogTitle>
        <DialogDescription>
          {t("common.export.description") || "Tùy chọn phạm vi, định dạng và các cột dữ liệu cần trích xuất."}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-5 py-2">
        {/* Format selection */}
        <div className="flex flex-col gap-2.5">
          <Label className="text-xs font-semibold text-foreground">
            {t("common.export.format") || "Định dạng tệp"}
          </Label>
          <RadioGroup
            value={format}
            onValueChange={(val) => setFormat(val as ExportFormat)}
            className="grid grid-cols-2 gap-3"
          >
            <div>
              <RadioGroupItem
                value="xlsx"
                id="format-xlsx"
                className="peer sr-only"
              />
              <Label
                htmlFor="format-xlsx"
                className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer text-center"
              >
                <FileSpreadsheet className="mb-2 size-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-semibold">Excel (.xls)</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  Chuẩn bảng tính
                </span>
              </Label>
            </div>

            <div>
              <RadioGroupItem
                value="csv"
                id="format-csv"
                className="peer sr-only"
              />
              <Label
                htmlFor="format-csv"
                className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer text-center"
              >
                <FileText className="mb-2 size-5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-semibold">CSV (UTF-8)</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  Dữ liệu thuần văn bản
                </span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Scope selection */}
        <div className="flex flex-col gap-2.5">
          <Label className="text-xs font-semibold text-foreground">
            {t("common.export.scope") || "Phạm vi xuất"}
          </Label>
          <RadioGroup
            value={scope}
            onValueChange={(val) => setScope(val as ExportScope)}
            className="flex flex-col gap-2 rounded-lg border p-3 bg-muted/20"
          >
            <div className="flex items-center space-x-2.5">
              <RadioGroupItem value="all" id="scope-all" />
              <Label htmlFor="scope-all" className="text-xs font-medium cursor-pointer flex-1 flex justify-between">
                <span>{t("common.export.scope_all") || "Tất cả kết quả lọc"}</span>
                <span className="text-muted-foreground font-mono">({totalFilteredCount})</span>
              </Label>
            </div>

            <div className="flex items-center space-x-2.5">
              <RadioGroupItem
                value="selected"
                id="scope-selected"
                disabled={selectedCount === 0}
              />
              <Label
                htmlFor="scope-selected"
                className={`text-xs font-medium flex-1 flex justify-between ${
                  selectedCount === 0 ? "text-muted-foreground cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <span>{t("common.export.scope_selected") || "Các dòng đang chọn"}</span>
                <span className="text-muted-foreground font-mono">({selectedCount})</span>
              </Label>
            </div>

            <div className="flex items-center space-x-2.5">
              <RadioGroupItem value="current_page" id="scope-page" />
              <Label htmlFor="scope-page" className="text-xs font-medium cursor-pointer flex-1 flex justify-between">
                <span>{t("common.export.scope_current_page") || "Trang hiện tại"}</span>
                <span className="text-muted-foreground font-mono">({currentPageCount})</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Columns selection */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-foreground">
              {t("common.export.columns") || "Cột xuất dữ liệu"} ({selectedColumnIds.length}/{exportableColumns.length})
            </Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllColumns}
                className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
              >
                {t("common.action.select_all") || "Chọn tất cả"}
              </button>
              <span className="text-muted-foreground text-xs">•</span>
              <button
                type="button"
                onClick={deselectAllColumns}
                className="text-[11px] text-muted-foreground hover:underline font-medium cursor-pointer"
              >
                {t("common.action.deselect_all") || "Bỏ chọn"}
              </button>
            </div>
          </div>

          <div className="max-h-36 overflow-y-auto rounded-md border p-2.5 space-y-2 bg-background">
            {exportableColumns.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`col-${column.id}`}
                  checked={selectedColumnIds.includes(column.id)}
                  onCheckedChange={() => toggleColumn(column.id)}
                />
                <Label
                  htmlFor={`col-${column.id}`}
                  className="text-xs font-normal cursor-pointer select-none truncate"
                >
                  {column.title}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isExporting}
        >
          {t("common.action.cancel") || "Hủy"}
        </Button>
        <Button
          type="button"
          onClick={handleExport}
          disabled={isExporting || selectedColumnIds.length === 0}
          className="gap-1.5"
        >
          <Download className="size-4" />
          {isExporting
            ? t("common.export.processing") || "Đang xuất..."
            : t("common.export.download") || "Tải xuống"}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
