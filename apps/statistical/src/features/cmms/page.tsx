import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { formatDateShort } from "@workspace/format"
import { statisticalApi, type CmmsResult } from "../api"

/**
 * CMMS compliance runs (fe_statistical #21): record a scenario run per
 * compliance period and see PASSED/FAILED history. Scenario/period config
 * lives in the QCMS catalogs.
 */
export function CmmsPage() {
  const { t } = useI18n()
  const [items, setItems] = useState<CmmsResult[]>([])
  const [loading, setLoading] = useState(true)
  const [scenario, setScenario] = useState("")
  const [period, setPeriod] = useState("")
  const [checked, setChecked] = useState("0")
  const [failed, setFailed] = useState("0")

  const load = useCallback(async () => {
    try {
      setItems(await statisticalApi.listCmmsResults())
    } catch {
      // keep empty
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const run = async () => {
    if (!scenario.trim() || !period.trim()) {
      notify.error(t("statistical.cmms.validation.required"))
      return
    }
    try {
      await statisticalApi.runCmms({
        scenario_code: scenario.trim(),
        compliance_period: period.trim(),
        checked_count: Number(checked) || 0,
        failed_count: Number(failed) || 0,
        details: {},
      })
      notify.success(t("statistical.cmms.toast.recorded"))
      setScenario("")
      setPeriod("")
      setChecked("0")
      setFailed("0")
      await load()
    } catch (err) {
      notify.error(
        t("statistical.cmms.toast.failed"),
        err instanceof Error ? err.message : String(err)
      )
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <div>
        <h1 className="text-lg font-semibold">{t("statistical.cmms.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("statistical.cmms.description")}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4 text-xs">
        <div className="space-y-1.5">
          <Label>{t("statistical.cmms.field.scenario")}</Label>
          <Input
            className="h-8 w-48 font-mono text-xs"
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("statistical.cmms.field.period")}</Label>
          <Input
            className="h-8 w-32 text-xs"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="2026-09"
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("statistical.cmms.field.checked")}</Label>
          <Input
            className="h-8 w-20 text-xs"
            inputMode="numeric"
            value={checked}
            onChange={(e) => setChecked(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("statistical.cmms.field.failed")}</Label>
          <Input
            className="h-8 w-20 text-xs"
            inputMode="numeric"
            value={failed}
            onChange={(e) => setFailed(e.target.value)}
          />
        </div>
        <Button size="sm" className="text-xs" onClick={() => void run()}>
          {t("statistical.cmms.btn.run")}
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("statistical.cmms.field.scenario")}</th>
              <th className="px-3 py-2">{t("statistical.cmms.field.period")}</th>
              <th className="px-3 py-2 text-right">{t("statistical.cmms.field.checked")}</th>
              <th className="px-3 py-2 text-right">{t("statistical.cmms.field.failed")}</th>
              <th className="px-3 py-2">{t("common.field.status")}</th>
              <th className="px-3 py-2">{t("statistical.cmms.col.run_at")}</th>
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
                  {t("statistical.cmms.empty")}
                </td>
              </tr>
            )}
            {items.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{row.scenario_code}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.compliance_period}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.checked_count}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.failed_count}</td>
                <td className="px-3 py-2">
                  <Badge variant={row.status === "PASSED" ? "default" : "destructive"}>
                    {row.status}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                  {formatDateShort(row.run_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
