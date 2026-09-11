import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { formatDateShort } from "@workspace/format"
import { customerReport, type CustomerReportRow } from "../api"

/** Báo cáo khách hàng (W4c) — lọc + xuất CSV. */
export function ReportsPage() {
  const { t } = useI18n()
  const [q, setQ] = useState("")
  const [customerType, setCustomerType] = useState("")
  const [status, setStatus] = useState("")
  const [rows, setRows] = useState<CustomerReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const result = await customerReport({
        q: q || undefined,
        customer_type: customerType || undefined,
        status: status || undefined,
      })
      setRows(result.items)
    } catch {
      setRows([])
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [customerType, q, status])

  useEffect(() => {
    void load()
  }, [load])

  const exportCsv = useCallback(() => {
    const columns = ["customer_code", "name", "customer_type", "mobile", "segment", "customer_rank", "risk_level", "status", "created_at"]
    const header = columns.join(",")
    const lines = rows.map((row) =>
      columns.map((column) => `"${row[column as keyof CustomerReportRow] ?? ""}"`).join(",")
    )
    const blob = new Blob(["\ufeff" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "customer-report.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }, [rows])

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("crm.reports.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("crm.reports.description")}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label>{t("crm.reports.field.search")}</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("crm.reports.field.type")}</Label>
            <select
              className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value)}
            >
              <option value="">{t("common.action.select_all")}</option>
              <option value="PERSONAL">PERSONAL</option>
              <option value="BUSINESS">BUSINESS</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("common.field.status")}</Label>
            <Input value={status} onChange={(e) => setStatus(e.target.value.toUpperCase())} />
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {t("crm.reports.run")}
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            {t("common.action.export_excel")}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("crm.reports.col.customer_code")}</th>
              <th className="px-3 py-2">{t("crm.reports.col.name")}</th>
              <th className="px-3 py-2">{t("crm.reports.col.customer_type")}</th>
              <th className="px-3 py-2">{t("crm.reports.col.segment")}</th>
              <th className="px-3 py-2">{t("crm.reports.col.risk_level")}</th>
              <th className="px-3 py-2">{t("common.field.status")}</th>
              <th className="px-3 py-2">{t("common.field.created")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                  {t("crm.reports.loading")}
                </td>
              </tr>
            )}
            {!loading && loadError && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                  {t("crm.reports.load_failed")}
                </td>
              </tr>
            )}
            {!loading && !loadError && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                  {t("crm.reports.empty")}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.customer_code} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{row.customer_code}</td>
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2">{row.customer_type}</td>
                <td className="px-3 py-2">{row.segment || "—"}</td>
                <td className="px-3 py-2">{row.risk_level || "—"}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                  {formatDateShort(row.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
