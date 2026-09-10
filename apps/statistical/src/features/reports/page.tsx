import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { apiUrl } from "@workspace/api/url"
import { statisticalApi, type ReportDefinition, type ReportRunResult } from "../api"

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

/** Report runner (Q8): pick a definition, run it and export the XLSX. */
export function ReportsPage() {
  const { t } = useI18n()
  const [definitions, setDefinitions] = useState<ReportDefinition[]>([])
  const [code, setCode] = useState("")
  const [periodCode, setPeriodCode] = useState(currentPeriod())
  const [orgCode, setOrgCode] = useState("")
  const [result, setResult] = useState<ReportRunResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void statisticalApi
      .listReportDefinitions({ perPage: 100 })
      .then((list) => {
        setDefinitions(list.items)
        if (list.items.length > 0) setCode((prev) => prev || list.items[0].code)
      })
      .catch(() => setDefinitions([]))
  }, [])

  const run = useCallback(async () => {
    if (!code || !periodCode) return
    setRunning(true)
    setError(null)
    try {
      setResult(await statisticalApi.runReport(code, { period_code: periodCode, org_code: orgCode || undefined }))
    } catch (reason) {
      setResult(null)
      setError(reason instanceof Error ? reason.message : t("statistical.reports.run_failed"))
    } finally {
      setRunning(false)
    }
  }, [code, orgCode, periodCode, t])

  const exportXlsx = useCallback(async () => {
    if (!code || !periodCode) return
    try {
      const response = await fetch(
        apiUrl(
          statisticalApi.reportExportUrl(code, { period_code: periodCode, org_code: orgCode || undefined })
        ),
        { credentials: "include" }
      )
      if (!response.ok) throw new Error(String(response.status))
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `${code}-${periodCode}.xlsx`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      notify.error(t("statistical.reports.export_failed"))
    }
  }, [code, orgCode, periodCode, t])

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div>
        <h1 className="text-lg font-semibold">{t("statistical.reports.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("statistical.reports.description")}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
        <div className="min-w-[240px] space-y-1.5">
          <Label>{t("statistical.submissions.field.report")}</Label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          >
            {definitions.map((definition) => (
              <option key={definition.id} value={definition.code}>
                {definition.code} — {definition.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("statistical.submissions.field.period")}</Label>
          <Input
            value={periodCode}
            placeholder="2026-09"
            onChange={(e) => setPeriodCode(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("statistical.reports.field.org")}</Label>
          <Input value={orgCode} onChange={(e) => setOrgCode(e.target.value)} />
        </div>
        <Button onClick={() => void run()} disabled={running || !code}>
          {t("statistical.reports.run")}
        </Button>
        <Button variant="outline" onClick={() => void exportXlsx()} disabled={!code || !result}>
          {t("common.action.export_excel")}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span>
              {result.name} · {result.query_id}
            </span>
            <span>{t("statistical.reports.row_count", { count: result.row_count })}</span>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  {result.columns.map((column) => (
                    <th key={column} className="px-3 py-2">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.length === 0 && (
                  <tr>
                    <td colSpan={result.columns.length} className="px-3 py-4 text-center text-muted-foreground">
                      {t("statistical.reports.empty")}
                    </td>
                  </tr>
                )}
                {result.rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-t border-border">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-3 py-2">
                        {cell === null || cell === undefined ? "—" : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
