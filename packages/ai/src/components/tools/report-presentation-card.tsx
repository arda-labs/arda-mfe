import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { downloadFile } from "@workspace/api"
import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { BarChart3, ChevronDown, FileSpreadsheet, FileText, LoaderCircle } from "lucide-react"
import { textValue, type ToolResultPayload } from "../../lib/messages"
import { registerToolRenderer } from "../../lib/registry"
import { ChartView, isChartPayload } from "./chart-card"
import { KpiGrid } from "./kpi-grid-card"

// ReportPresentationCard renders the `arda.statistical.getReportPresentation`
// payload (and, as a fallback, a plain `runReport` result): KPI cards, a chart
// the server chose deterministically, and the detail table. The server owns the
// presentation; the panel only lays it out.
export function isReportPresentationResult(result: ToolResultPayload): boolean {
  return Array.isArray(result.columns) && Array.isArray(result.rows)
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => (item == null ? "" : String(item))) : []
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "number") {
    return value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })
  }
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

export function ReportPresentationCard({ result }: { result: ToolResultPayload }) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState(false)

  const columns = toStringArray(result.columns)
  const rows = Array.isArray(result.rows)
    ? result.rows.filter((row): row is unknown[] => Array.isArray(row))
    : []
  const totalRows = typeof result.row_count === "number" ? result.row_count : rows.length
  const kpis = Array.isArray(result.kpis) ? result.kpis : []
  const chart = isChartPayload(result.chart) ? result.chart : undefined
  const title = textValue(result.report_name, textValue(result.report_code, t("ai.tool.report.title")))
  const period = textValue(result.period_code)
  const org = textValue(result.org_code)
  const reportCode = textValue(result.report_code)
  const canDownload = reportCode !== "" && period !== ""
  const visibleRows = expanded ? rows : rows.slice(0, 8)

  // Documents are served by the existing statistical report endpoint through
  // auth-gateway (policy statistical-read), so a download is authorized and
  // audited like any other report view — no artifact store needed.
  const handleDownload = async (format: "xlsx" | "pdf") => {
    if (!canDownload) return
    setDownloading(format)
    setDownloadError(false)
    try {
      const params = new URLSearchParams({ period_code: period, format })
      if (org) params.set("org_code", org)
      await downloadFile(
        `/api/statistical/reports/${encodeURIComponent(reportCode)}/document?${params.toString()}`
      )
    } catch {
      setDownloadError(true)
    } finally {
      setDownloading(null)
    }
  }
  const hasMore = rows.length > 8

  return (
    <div className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xs">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
          <BarChart3 className="size-3.5 shrink-0 text-primary" />
          <span className="truncate text-xs">{title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          {period && <span>{t("ai.tool.report.period", { period })}</span>}
          {org && <span>· {org}</span>}
          <span>· {t("ai.tool.report.row_count", { count: totalRows })}</span>
        </div>
      </div>

      <div className="space-y-3 p-3">
        {kpis.length > 0 && <KpiGrid kpis={kpis} title={t("ai.tool.report.kpi_title")} />}
        {chart && <ChartView chart={chart} />}

        {columns.length > 0 && rows.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">{t("ai.tool.report.table_title")}</p>
            <div className="overflow-x-auto rounded-lg border">
              <Table className="text-left text-xs">
                <TableHeader className="bg-muted/40 text-[11px]">
                  <TableRow>
                    {columns.map((col, index) => (
                      <TableHead key={`${col}-${index}`} className="h-auto whitespace-nowrap py-2 text-[11px]">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((row, rowIndex) => (
                    <TableRow key={rowIndex} className="transition-colors hover:bg-muted/20">
                      {columns.map((_, colIndex) => (
                        <TableCell key={colIndex} className="whitespace-nowrap py-1.5 text-[11px] tabular-nums">
                          {formatCell(row[colIndex])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {hasMore && (
              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded((value) => !value)}
                  className="h-6 gap-1 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  <span>
                    {expanded
                      ? t("ai.table.show_less")
                      : t("ai.table.show_more", { count: rows.length - 8 })}
                  </span>
                  <ChevronDown className={`size-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {canDownload && (
        <div className="flex flex-wrap items-center gap-2 border-t bg-muted/20 px-3 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={downloading !== null}
            onClick={() => void handleDownload("xlsx")}
            className="h-7 gap-1.5 px-2 text-[11px]"
          >
            {downloading === "xlsx" ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-3.5" />
            )}
            {t("ai.tool.report.download_xlsx")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={downloading !== null}
            onClick={() => void handleDownload("pdf")}
            className="h-7 gap-1.5 px-2 text-[11px]"
          >
            {downloading === "pdf" ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <FileText className="size-3.5" />
            )}
            {t("ai.tool.report.download_pdf")}
          </Button>
          {downloadError && (
            <span className="text-[11px] text-destructive">{t("ai.tool.report.download_error")}</span>
          )}
        </div>
      )}
    </div>
  )
}

export function registerReportPresentationRenderer() {
  registerToolRenderer({
    id: "arda.statistical-report-presentation",
    match: isReportPresentationResult,
    component: ReportPresentationCard,
  })
}
