import { useCallback, useEffect, useState } from "react"
import { Plus, RefreshCw } from "lucide-react"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Page } from "@workspace/ui/components/page"
import { PageHeader } from "@workspace/ui/components/page-header"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { formatMoney, fromMinor, todayISO } from "@workspace/format"
import { postingApi, type OpeningBalance } from "../api"
import { UpsertOpeningBalanceDialog } from "./components/upsert-dialog"

/**
 * Nhập số dư đầu kỳ (Q11 / Q2 migration): list snapshot hiệu lực ≤ as_of +
 * upsert từng dòng theo (kỳ, COA version, tài khoản, loại tiền). BE idempotent
 * theo cùng khóa nên nhập lại chỉ ghi đè giá trị.
 */
export function OpeningBalancesPage() {
  const { t } = useI18n()
  const [asOf, setAsOf] = useState(todayISO())
  const [items, setItems] = useState<OpeningBalance[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(
    async (date: string) => {
      setLoading(true)
      try {
        const res = await postingApi.listOpeningBalances(date)
        setItems(res)
      } catch (error) {
        notify.error(
          translateApiError(error, t("finance.opening_balances.load_failed"))
        )
      } finally {
        setLoading(false)
      }
    },
    [t]
  )

  useEffect(() => {
    void load(asOf)
  }, [load, asOf])

  return (
    <Page variant="fixed">
      <PageHeader
        title={t("finance.opening_balances.title")}
        description={t("finance.opening_balances.description")}
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => void load(asOf)}
            >
              <RefreshCw className="size-4" />
              {t("finance.opening_balances.refresh")}
            </Button>
            <Button type="button" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              {t("finance.opening_balances.add")}
            </Button>
          </>
        }
        meta={
          items.length ? (
            <Badge variant="secondary" className="shrink-0">
              {t("finance.opening_balances.count_badge", {
                count: items.length,
              })}
            </Badge>
          ) : null
        }
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-48 space-y-1.5">
            <Label htmlFor="ob-as-of">
              {t("finance.opening_balances.field.as_of")}
            </Label>
            <Input
              id="ob-as-of"
              type="date"
              value={asOf}
              onChange={(event) => setAsOf(event.target.value)}
            />
          </div>
          <p className="pb-2 text-xs text-muted-foreground">
            {t("finance.opening_balances.as_of_hint")}
          </p>
        </div>

        {loading ? (
          <div className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">
            {t("finance.opening_balances.loading")}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">
            {t("finance.opening_balances.empty")}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("finance.opening_balances.col.date")}</TableHead>
                  <TableHead>{t("finance.opening_balances.col.version")}</TableHead>
                  <TableHead>{t("finance.opening_balances.col.account")}</TableHead>
                  <TableHead>{t("finance.opening_balances.col.currency")}</TableHead>
                  <TableHead>{t("finance.opening_balances.col.direction")}</TableHead>
                  <TableHead className="text-right">
                    {t("finance.opening_balances.col.amount")}
                  </TableHead>
                  <TableHead>{t("finance.opening_balances.col.description")}</TableHead>
                  <TableHead>{t("finance.opening_balances.col.source")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow
                    key={`${row.account_code}-${row.currency_code}-${row.coa_version}`}
                  >
                    <TableCell className="whitespace-nowrap">
                      {row.accounting_date}
                    </TableCell>
                    <TableCell>{row.coa_version || "—"}</TableCell>
                    <TableCell className="font-medium tabular-nums">
                      {row.account_code}
                    </TableCell>
                    <TableCell>{row.currency_code}</TableCell>
                    <TableCell>
                      {t(`finance.opening_balances.direction.${row.direction}`)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(
                        fromMinor(row.amount_minor, row.currency_code)
                      )}
                    </TableCell>
                    <TableCell className="max-w-64 truncate" title={row.description}>
                      {row.description || "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">{row.source_key || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <UpsertOpeningBalanceDialog
        open={dialogOpen}
        defaultDate={asOf}
        onOpenChange={setDialogOpen}
        onSaved={() => {
          setDialogOpen(false)
          void load(asOf)
        }}
      />
    </Page>
  )
}
