import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { formatAmount, fromMinor } from "@workspace/format"
import { depositApi, type Savings } from "../api"

/**
 * Batch interest payment (DPM.304): lists active savings with accrued
 * interest and stages one maker/checker case covering them all.
 */
export function BatchInterestPage() {
  const { t } = useI18n()
  const [items, setItems] = useState<Savings[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await depositApi.listSavings({ status: "ACTIVE" })
      setItems(result.items.filter((item) => item.accrued_minor > 0))
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async () => {
    setSubmitting(true)
    try {
      const result = await depositApi.submitBatchInterest()
      setLastResult(result.total)
    } catch {
      setLastResult(null)
      setLoadError(true)
    } finally {
      setSubmitting(false)
    }
  }

  const totalMinor = items.reduce((sum, item) => sum + item.accrued_minor, 0)

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("deposit.batch_interest.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("deposit.batch_interest.description")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{t("deposit.batch_interest.count", { count: items.length })}</Badge>
          <Button onClick={() => void submit()} disabled={submitting || items.length === 0}>
            {t("deposit.batch_interest.submit")}
          </Button>
        </div>
      </div>

      {lastResult !== null && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
          {t("deposit.batch_interest.submitted", { count: lastResult })}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("deposit.savings.field.code")}</th>
              <th className="px-3 py-2">{t("deposit.savings.field.customer")}</th>
              <th className="px-3 py-2">{t("deposit.products.title")}</th>
              <th className="px-3 py-2 text-right">{t("deposit.savings.field.accrued")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                  {t("deposit.loading")}
                </td>
              </tr>
            )}
            {!loading && loadError && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                  {t("deposit.batch_interest.load_failed")}{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => void load()}
                  >
                    {t("common.action.retry")}
                  </button>
                </td>
              </tr>
            )}
            {!loading && !loadError && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                  {t("deposit.batch_interest.empty")}
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <Link
                    to={`/deposit/savings/${item.savings_code}`}
                    className="font-mono text-xs font-semibold text-primary hover:underline"
                  >
                    {item.savings_code}
                  </Link>
                </td>
                <td className="px-3 py-2">{item.customer_code}</td>
                <td className="px-3 py-2">{item.product_code}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatAmount(fromMinor(item.accrued_minor, item.currency_code), item.currency_code)}
                </td>
              </tr>
            ))}
            {items.length > 0 && (
              <tr className="border-t border-border bg-muted/30 font-medium">
                <td colSpan={3} className="px-3 py-2 text-right">
                  {t("deposit.batch_interest.total")}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatAmount(fromMinor(totalMinor, items[0].currency_code), items[0].currency_code)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
