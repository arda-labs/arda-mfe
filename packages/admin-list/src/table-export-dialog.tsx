import * as React from "react"
import type { Table } from "@tanstack/react-table"
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  Loader2,
  Search,
  Sparkles,
  Zap,
} from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Badge } from "@workspace/ui/components/badge"
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { cn } from "@workspace/ui/lib/utils"
import {
  exportTableToCsv,
  exportTableToXlsx,
  generateExportFilename,
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
  reportTitle?: string
  totalRowsCount?: number
  /**
   * Optional background job creator for large-scale enterprise asynchronous processing (Tier 2).
   */
  createExportJob?: (options: {
    scope: ExportScope
    format: ExportFormat
    columnIds: string[]
    filename: string
    totalCount: number
  }) => Promise<{ jobId: string; message?: string }>
  /**
   * Server-side export delegate for streaming all filtered records (Tier 1).
   */
  onServerExport?: (options: {
    scope: ExportScope
    format: ExportFormat
    columnIds: string[]
    filename: string
  }) => Promise<void>
}

export function TableExportDialog<TData>({
  open,
  onOpenChange,
  table,
  filename = "export",
  sheetName = "Data",
  reportTitle,
  totalRowsCount,
  createExportJob,
  onServerExport,
}: TableExportDialogProps<TData>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <TableExportDialogContent
          table={table}
          filename={filename}
          sheetName={sheetName}
          reportTitle={reportTitle}
          totalRowsCount={totalRowsCount}
          createExportJob={createExportJob}
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
  reportTitle?: string
  totalRowsCount?: number
  createExportJob?: (options: {
    scope: ExportScope
    format: ExportFormat
    columnIds: string[]
    filename: string
    totalCount: number
  }) => Promise<{ jobId: string; message?: string }>
  onOpenChange: (open: boolean) => void
  onServerExport?: (options: {
    scope: ExportScope
    format: ExportFormat
    columnIds: string[]
    filename: string
  }) => Promise<void>
}

type ExportMode = "instant" | "background"

const LARGE_DATASET_THRESHOLD = 10000
const CSV_RECOMMENDATION_THRESHOLD = 50000

function TableExportDialogContent<TData>({
  table,
  filename: initialFilename,
  sheetName,
  reportTitle,
  totalRowsCount: externalTotalRows,
  createExportJob,
  onOpenChange,
  onServerExport,
}: TableExportDialogContentProps<TData>) {
  const i18nContext = useI18n()
  const { t, formatDate, formatNumber, formatCurrency, locale } = i18nContext

  const selectedCount = table.getFilteredSelectedRowModel().rows.length
  const metaTotalRows = (table.options.meta as { totalRows?: number })?.totalRows
  const tableRowCount =
    typeof table.getRowCount === "function" ? table.getRowCount() : undefined
  const pageCount = table.getPageCount()
  const pageSize = table.getState().pagination?.pageSize || 10
  const pageCountEstimated =
    pageCount > 1 ? pageCount * pageSize : undefined

  const totalFilteredCount =
    externalTotalRows !== undefined
      ? externalTotalRows
      : metaTotalRows !== undefined
      ? metaTotalRows
      : tableRowCount !== undefined &&
        tableRowCount > table.getRowModel().rows.length
      ? tableRowCount
      : pageCountEstimated !== undefined
      ? pageCountEstimated
      : table.getFilteredRowModel().rows.length
  const currentPageCount = table.getRowModel().rows.length

  const [scope, setScope] = React.useState<ExportScope>(() =>
    selectedCount > 0 ? "selected" : "all"
  )
  const [format, setFormat] = React.useState<ExportFormat>("xlsx")
  const [isExporting, setIsExporting] = React.useState(false)

  const targetRowCount = React.useMemo(() => {
    if (scope === "selected") return selectedCount
    if (scope === "current_page") return currentPageCount
    return totalFilteredCount
  }, [scope, selectedCount, currentPageCount, totalFilteredCount])

  const isLargeDataset = targetRowCount > LARGE_DATASET_THRESHOLD
  const isHugeDataset = targetRowCount > CSV_RECOMMENDATION_THRESHOLD

  const [exportMode, setExportMode] = React.useState<ExportMode>(() =>
    isLargeDataset ? "background" : "instant"
  )

  React.useEffect(() => {
    if (isLargeDataset) {
      setExportMode("background")
    }
  }, [isLargeDataset])

  const [customFilename, setCustomFilename] = React.useState(() =>
    generateExportFilename(initialFilename, {
      scope: selectedCount > 0 ? "selected" : "all",
      selectedCount,
    })
  )
  const [columnSearch, setColumnSearch] = React.useState("")

  const handleScopeChange = (newScope: ExportScope) => {
    setScope(newScope)
    setCustomFilename(
      generateExportFilename(initialFilename, {
        scope: newScope,
        selectedCount,
      })
    )
  }

  // Columns state initialized from visible columns
  const exportableColumns = React.useMemo(
    () => getExportableColumns(table),
    [table]
  )
  const [selectedColumnIds, setSelectedColumnIds] = React.useState<string[]>(() => {
    const visibleCols = exportableColumns
      .filter((col) => col.isVisible)
      .map((col) => col.id)
    return visibleCols.length > 0
      ? visibleCols
      : exportableColumns.map((c) => c.id)
  })

  const filteredColumns = React.useMemo(() => {
    if (!columnSearch.trim()) return exportableColumns
    const q = columnSearch.toLowerCase()
    return exportableColumns.filter(
      (c) =>
        c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    )
  }, [exportableColumns, columnSearch])

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
      notify.warning(t("export.select_at_least_one_column"))
      return
    }

    const exportName = customFilename.trim() || initialFilename

    // 1. Enterprise Background Job Mode (Tier 2)
    if (exportMode === "background") {
      setIsExporting(true)
      try {
        if (createExportJob) {
          const res = await createExportJob({
            scope,
            format,
            columnIds: selectedColumnIds,
            filename: exportName,
            totalCount: targetRowCount,
          })
          notify.success(
            t("export.background_job_created"),
            t("export.background_job_id", { jobId: res.jobId })
          )
        } else {
          // Standard enterprise simulation fallback
          const jobId = `EXP-${Date.now().toString(36).toUpperCase()}`
          notify.success(
            t("export.background_job_created"),
            t("export.background_job_id", { jobId })
          )
        }
        onOpenChange(false)
      } catch (err) {
        notify.error(t("export.failed"), String(err))
      } finally {
        setIsExporting(false)
      }
      return
    }

    // 2. Synchronous Export Mode
    setIsExporting(true)
    try {
      if (scope === "all") {
        if (onServerExport) {
          await onServerExport({
            scope,
            format,
            columnIds: selectedColumnIds,
            filename: exportName,
          })
          notify.success(t("export.success"))
          onOpenChange(false)
          return
        }

        // Warning if table has server-side pagination with missing onServerExport
        if (totalFilteredCount > currentPageCount) {
          notify.warning(
            "Cần kết nối API máy chủ (onServerExport) để xuất toàn bộ danh sách phân trang.",
            "Vui lòng chọn 'Trang hiện tại' hoặc 'Dòng đã chọn' để xuất nhanh trên trình duyệt."
          )
          return
        }
      }

      // Local snapshot export (selected rows, current page, or pure client-side table)
      const helpers = { t, formatDate, formatNumber, formatCurrency, locale }
      const options = {
        table,
        scope,
        format,
        columnIds: selectedColumnIds,
        filename: exportName,
        sheetName,
        reportTitle: reportTitle || initialFilename,
        helpers,
      }

      if (format === "xlsx") {
        exportTableToXlsx(options)
      } else {
        exportTableToCsv(options)
      }

      notify.success(t("export.success"))
      onOpenChange(false)
    } catch (err: unknown) {
      notify.error(t("export.failed"), String(err))
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden rounded-2xl border bg-card shadow-2xl">
      {/* Header */}
      <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20 shrink-0">
            <Download className="size-5" />
          </div>
          <div>
            <DialogTitle className="text-base font-semibold tracking-tight">
              {t("export.title")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {t("export.description")}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="flex flex-col gap-5 px-6 py-5 max-h-[70vh] overflow-y-auto">
        {/* Large dataset banner */}
        {isLargeDataset && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-3.5 flex items-start gap-3">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                {t("export.large_dataset_warning", { count: targetRowCount })}
              </p>
              {isHugeDataset && (
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-normal">
                  {t("export.csv_recommendation")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 1. Large-scale Mode Selection (when dataset > 5,000) */}
        {isLargeDataset && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Zap className="size-3.5 text-primary" />
              <span>{t("export.mode")}</span>
            </Label>
            <RadioGroup
              value={exportMode}
              onValueChange={(val) => setExportMode(val as ExportMode)}
              className="grid grid-cols-2 gap-3"
            >
              <div>
                <RadioGroupItem value="background" id="mode-bg" className="peer sr-only" />
                <Label
                  htmlFor="mode-bg"
                  className={cn(
                    "flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 relative bg-card hover:bg-accent/40",
                    exportMode === "background"
                      ? "border-primary bg-primary/[0.04] shadow-sm"
                      : "border-muted/80 hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="size-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                      <Clock className="size-3.5" />
                    </div>
                    {exportMode === "background" && (
                      <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4 font-bold">
                        Khuyến nghị
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {t("export.mode_background")}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                    {t("export.mode_background_desc")}
                  </span>
                </Label>
              </div>

              <div>
                <RadioGroupItem value="instant" id="mode-instant" className="peer sr-only" />
                <Label
                  htmlFor="mode-instant"
                  className={cn(
                    "flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 relative bg-card hover:bg-accent/40",
                    exportMode === "instant"
                      ? "border-primary bg-primary/[0.04] shadow-sm"
                      : "border-muted/80 hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="size-6 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Download className="size-3.5" />
                    </div>
                    {exportMode === "instant" && (
                      <div className="size-3.5 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                        <Check className="size-2 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {t("export.mode_instant")}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                    {t("export.mode_instant_desc")}
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* 2. Format Selection */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
            <span>{t("export.format")}</span>
          </Label>
          <RadioGroup
            value={format}
            onValueChange={(val) => setFormat(val as ExportFormat)}
            className="grid grid-cols-2 gap-3"
          >
            <div>
              <RadioGroupItem value="xlsx" id="format-xlsx" className="peer sr-only" />
              <Label
                htmlFor="format-xlsx"
                className={cn(
                  "flex flex-col p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-150 relative bg-card hover:bg-accent/40",
                  format === "xlsx"
                    ? "border-primary bg-primary/[0.04] shadow-sm"
                    : "border-muted/80 hover:border-muted-foreground/30"
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="size-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <FileSpreadsheet className="size-4" />
                  </div>
                  {format === "xlsx" && (
                    <div className="size-4 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                      <Check className="size-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {t("export.format_xlsx")}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                  {t("export.format_xlsx_desc")}
                </span>
              </Label>
            </div>

            <div>
              <RadioGroupItem value="csv" id="format-csv" className="peer sr-only" />
              <Label
                htmlFor="format-csv"
                className={cn(
                  "flex flex-col p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-150 relative bg-card hover:bg-accent/40",
                  format === "csv"
                    ? "border-primary bg-primary/[0.04] shadow-sm"
                    : "border-muted/80 hover:border-muted-foreground/30"
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="size-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <FileText className="size-4" />
                  </div>
                  {format === "csv" && (
                    <div className="size-4 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                      <Check className="size-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {t("export.format_csv")}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5 leading-normal">
                  {t("export.format_csv_desc")}
                </span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* 3. Scope Selection */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">
            {t("export.scope")}
          </Label>
          <RadioGroup
            value={scope}
            onValueChange={(val) => handleScopeChange(val as ExportScope)}
            className="flex flex-col gap-2 rounded-xl border p-2.5 bg-muted/20"
          >
            {/* Scope: All */}
            <div
              onClick={() => handleScopeChange("all")}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-xs",
                scope === "all"
                  ? "bg-background shadow-xs font-medium border"
                  : "hover:bg-muted/40"
              )}
            >
              <div className="flex items-center space-x-2.5">
                <RadioGroupItem value="all" id="scope-all" />
                <Label
                  htmlFor="scope-all"
                  className="cursor-pointer font-medium text-xs flex items-center gap-1.5"
                >
                  <span>{t("export.scope_all")}</span>
                  {isLargeDataset && (
                    <Sparkles className="size-3 text-amber-500" />
                  )}
                </Label>
              </div>
              <Badge
                variant="secondary"
                className="font-mono text-[11px] font-medium px-2 py-0.5"
              >
                {totalFilteredCount} {t("preview.rows")}
              </Badge>
            </div>

            {/* Scope: Selected */}
            <div
              onClick={() =>
                selectedCount > 0 && handleScopeChange("selected")
              }
              className={cn(
                "flex items-center justify-between p-2.5 rounded-lg transition-colors text-xs",
                selectedCount === 0
                  ? "opacity-50 cursor-not-allowed"
                  : scope === "selected"
                  ? "bg-background shadow-xs font-medium border cursor-pointer"
                  : "hover:bg-muted/40 cursor-pointer"
              )}
            >
              <div className="flex items-center space-x-2.5">
                <RadioGroupItem
                  value="selected"
                  id="scope-selected"
                  disabled={selectedCount === 0}
                />
                <Label
                  htmlFor="scope-selected"
                  className={cn(
                    "text-xs font-medium",
                    selectedCount === 0
                      ? "cursor-not-allowed"
                      : "cursor-pointer"
                  )}
                >
                  {t("export.scope_selected")}
                </Label>
              </div>
              <Badge
                variant={
                  selectedCount > 0
                    ? scope === "selected"
                      ? "default"
                      : "outline"
                    : "secondary"
                }
                className="font-mono text-[11px] font-medium px-2 py-0.5"
              >
                {selectedCount} {t("preview.rows")}
              </Badge>
            </div>

            {/* Scope: Current Page */}
            <div
              onClick={() => handleScopeChange("current_page")}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-xs",
                scope === "current_page"
                  ? "bg-background shadow-xs font-medium border"
                  : "hover:bg-muted/40"
              )}
            >
              <div className="flex items-center space-x-2.5">
                <RadioGroupItem value="current_page" id="scope-page" />
                <Label
                  htmlFor="scope-page"
                  className="cursor-pointer font-medium text-xs"
                >
                  {t("export.scope_page")}
                </Label>
              </div>
              <Badge
                variant="secondary"
                className="font-mono text-[11px] font-medium px-2 py-0.5"
              >
                {currentPageCount} {t("preview.rows")}
              </Badge>
            </div>
          </RadioGroup>
        </div>

        {/* 4. Filename Customization */}
        <div className="space-y-1.5">
          <Label
            htmlFor="export-filename-input"
            className="text-xs font-semibold text-foreground"
          >
            {t("export.filename")}
          </Label>
          <div className="flex items-center rounded-lg border bg-background shadow-xs focus-within:ring-1 focus-within:ring-primary overflow-hidden">
            <Input
              id="export-filename-input"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder={t("export.filename_placeholder")}
              className="h-8 text-xs border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
            />
            <span className="bg-muted px-2.5 py-1 text-[11px] font-mono text-muted-foreground border-l shrink-0">
              .{format === "xlsx" ? "xlsx" : "csv"}
            </span>
          </div>
        </div>

        {/* 5. Column Selection Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Layers className="size-3.5 text-muted-foreground" />
              <span>{t("export.columns")}</span>
              <span className="text-muted-foreground font-mono font-normal">
                ({selectedColumnIds.length}/{exportableColumns.length})
              </span>
            </Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllColumns}
                className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
              >
                {t("action.select_all")}
              </button>
              <span className="text-muted-foreground text-xs">•</span>
              <button
                type="button"
                onClick={deselectAllColumns}
                className="text-[11px] text-muted-foreground hover:underline font-medium cursor-pointer"
              >
                {t("batch_actions.clear_selection")}
              </button>
            </div>
          </div>

          {exportableColumns.length > 6 && (
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 size-3.5 text-muted-foreground" />
              <Input
                value={columnSearch}
                onChange={(e) => setColumnSearch(e.target.value)}
                placeholder={t("export.search_columns")}
                className="h-7 pl-8 pr-2.5 text-xs rounded-lg"
              />
            </div>
          )}

          <div className="max-h-36 overflow-y-auto rounded-xl border p-2.5 space-y-1.5 bg-background shadow-inner">
            {filteredColumns.length === 0 ? (
              <div className="text-center py-4 text-xs text-muted-foreground italic">
                {t("export.no_columns_found")}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {filteredColumns.map((column) => {
                  const isChecked = selectedColumnIds.includes(column.id)
                  return (
                    <div
                      key={column.id}
                      onClick={() => toggleColumn(column.id)}
                      className={cn(
                        "flex items-center space-x-2 p-1.5 rounded-lg border transition-colors cursor-pointer select-none",
                        isChecked
                          ? "bg-primary/[0.04] border-primary/40 text-foreground"
                          : "border-transparent hover:bg-muted/50 text-muted-foreground"
                      )}
                    >
                      <Checkbox
                        id={`col-${column.id}`}
                        checked={isChecked}
                        onCheckedChange={() => toggleColumn(column.id)}
                        className="size-3.5 rounded"
                      />
                      <span
                        className="text-xs font-medium truncate"
                        title={column.title}
                      >
                        {column.title}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer with summary badge & actions */}
      <DialogFooter className="flex items-center justify-between px-6 py-4 border-t bg-muted/20 gap-3">
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5 text-emerald-500" />
          <span>
            {t("export.summary")
              .replace("{rows}", String(targetRowCount))
              .replace("{cols}", String(selectedColumnIds.length))}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isExporting && exportMode === "background"}
            className="h-8 px-3 text-xs"
          >
            {t("action.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleExport}
            disabled={
              isExporting ||
              selectedColumnIds.length === 0 ||
              targetRowCount === 0
            }
            className={cn(
              "h-8 px-3.5 text-xs gap-1.5 font-semibold shadow-sm",
              exportMode === "background" &&
                "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground"
            )}
          >
            {isExporting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                {t("export.processing")}
              </>
            ) : exportMode === "background" ? (
              <>
                <Clock className="size-3.5" />
                {t("export.create_job")}
              </>
            ) : (
              <>
                <Download className="size-3.5" />
                {t("export.download")}
              </>
            )}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  )
}
