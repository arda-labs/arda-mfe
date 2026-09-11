import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { formatDateShort } from "@workspace/format"
import {
  statisticalApi,
  type ImportTransaction,
} from "../api"

/**
 * QCMS import transaction staging (fe_statistical #20): stage import rows per
 * (import type, period) then submit them.
 */
export function ImportPage() {
  const { t } = useI18n()
  const [items, setItems] = useState<ImportTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState("")
  const [importType, setImportType] = useState("")
  const [period, setPeriod] = useState("")
  const [rowCount, setRowCount] = useState("0")

  const load = useCallback(async () => {
    try {
      setItems(await statisticalApi.listImportTransactions())
    } catch {
      // keep empty
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const stage = async () => {
    if (!importType.trim() || !period.trim()) {
      notify.error(t("statistical.import.validation.required"))
      return
    }
    try {
      await statisticalApi.upsertImportTransaction({
        import_type_code: importType.trim(),
        period_code: period.trim(),
        row_count: Number(rowCount) || 0,
        status: "STAGED",
        payload: {},
      })
      notify.success(t("statistical.import.toast.staged"))
      setImportType("")
      setPeriod("")
      setRowCount("0")
      await load()
    } catch (err) {
      notify.error(
        t("statistical.import.toast.failed"),
        err instanceof Error ? err.message : String(err)
      )
    }
  }

  const submit = async (row: ImportTransaction) => {
    setBusy(row.id)
    try {
      await statisticalApi.submitImportTransaction(row.id)
      notify.success(t("statistical.import.toast.submitted"))
      await load()
    } catch (err) {
      notify.error(
        t("statistical.import.toast.failed"),
        err instanceof Error ? err.message : String(err)
      )
    } finally {
      setBusy("")
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <div>
        <h1 className="text-lg font-semibold">{t("statistical.import.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("statistical.import.description")}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4 text-xs">
        <div className="space-y-1.5">
          <Label>{t("statistical.import.field.type")}</Label>
          <Input
            className="h-8 w-48 font-mono text-xs"
            value={importType}
            onChange={(e) => setImportType(e.target.value)}
            placeholder="import-type"
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("statistical.import.field.period")}</Label>
          <Input
            className="h-8 w-32 text-xs"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="2026-09"
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("statistical.import.field.rows")}</Label>
          <Input
            className="h-8 w-24 text-xs"
            inputMode="numeric"
            value={rowCount}
            onChange={(e) => setRowCount(e.target.value)}
          />
        </div>
        <Button size="sm" className="text-xs" onClick={() => void stage()}>
          {t("statistical.import.btn.stage")}
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("statistical.import.field.type")}</th>
              <th className="px-3 py-2">{t("statistical.import.field.period")}</th>
              <th className="px-3 py-2 text-right">{t("statistical.import.field.rows")}</th>
              <th className="px-3 py-2">{t("common.field.status")}</th>
              <th className="px-3 py-2">{t("common.field.created")}</th>
              <th className="px-3 py-2 text-right">{t("common.field.action")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                  {t("common.loading")}
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                  {t("statistical.import.empty")}
                </td>
              </tr>
            )}
            {items.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{row.import_type_code}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.period_code}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.row_count}</td>
                <td className="px-3 py-2">
                  <Badge variant={row.status === "POSTED" ? "default" : "secondary"}>
                    {row.status}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                  {formatDateShort(row.created_at)}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    disabled={row.status === "POSTED" || busy === row.id}
                    onClick={() => void submit(row)}
                  >
                    {t("statistical.import.btn.submit")}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
