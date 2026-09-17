import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useI18n } from "@workspace/i18n"
import { attachStagedCaseFiles, useStagedAttachments } from "@workspace/case-tabs"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { formatAmount, fromMinor } from "@workspace/format"
import { depositApi, type Savings } from "../api"

/**
 * Batch interest payment (DPM.304): lists active savings with accrued
 * interest and stages one maker/checker case covering them all.
 */
export function BatchInterestPage() {
  const { t } = useI18n()
  const staged = useStagedAttachments({ module: "deposit" })
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
      // One workflow case covers the whole batch — attach staged files to it.
      try {
        await attachStagedCaseFiles(staged.ids, result.items[0]?.workflow_case_id ?? "")
      } catch {
        notify.error(t("common.case_tabs.attachments.attach_error"))
      }
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

      {staged.tab.content}

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>{t("deposit.savings.field.code")}</TableHead>
              <TableHead>{t("deposit.savings.field.customer")}</TableHead>
              <TableHead>{t("deposit.products.title")}</TableHead>
              <TableHead className="text-right">{t("deposit.savings.field.accrued")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={4} className="py-4 text-center text-muted-foreground">
                  {t("deposit.loading")}
                </TableCell>
              </TableRow>
            )}
            {!loading && loadError && (
              <TableRow>
                <TableCell colSpan={4} className="py-4 text-center text-muted-foreground">
                  {t("deposit.batch_interest.load_failed")}{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => void load()}
                  >
                    {t("common.action.retry")}
                  </button>
                </TableCell>
              </TableRow>
            )}
            {!loading && !loadError && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-4 text-center text-muted-foreground">
                  {t("deposit.batch_interest.empty")}
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Link
                    to={`/deposit/savings/${item.savings_code}`}
                    className="font-mono text-xs font-semibold text-primary hover:underline"
                  >
                    {item.savings_code}
                  </Link>
                </TableCell>
                <TableCell>{item.customer_code}</TableCell>
                <TableCell>{item.product_code}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAmount(fromMinor(item.accrued_minor, item.currency_code), item.currency_code)}
                </TableCell>
              </TableRow>
            ))}
            {items.length > 0 && (
              <TableRow className="bg-muted/30 font-medium">
                <TableCell colSpan={3} className="text-right">
                  {t("deposit.batch_interest.total")}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAmount(fromMinor(totalMinor, items[0].currency_code), items[0].currency_code)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
