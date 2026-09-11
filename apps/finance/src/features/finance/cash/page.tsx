import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { formatAmount, formatDateShort, fromMinor, toMinor } from "@workspace/format"
import {
  cashPosition,
  listCash,
  recordCash,
  type CashPositionRow,
  type CashTxn,
} from "../api"

type TabKey = "transactions" | "position"

function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

/** VCM cash book (sổ quỹ tiền mặt, W7): transactions + daily position. */
export function CashPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<TabKey>("transactions")
  const [transactions, setTransactions] = useState<CashTxn[]>([])
  const [position, setPosition] = useState<CashPositionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)

  const [direction, setDirection] = useState<"IN" | "OUT">("IN")
  const [txnDate, setTxnDate] = useState(today())
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const [txns, pos] = await Promise.all([listCash(), cashPosition()])
      setTransactions(txns.items)
      setPosition(pos)
    } catch {
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async () => {
    const amountMinor = toMinor(Number(amount) || 0, "VND")
    if (amountMinor <= 0 || !txnDate) {
      notify.error(t("finance.cash.validation.required"))
      return
    }
    try {
      await recordCash({
        txn_date: txnDate,
        direction,
        amount_minor: amountMinor,
        currency_code: "VND",
        description,
      })
      notify.success(t("finance.cash.save_success"))
      setAmount("")
      setDescription("")
      await load()
    } catch {
      notify.error(t("finance.cash.save_failed"))
    }
  }

  const exportCsv = useCallback(() => {
    if (tab === "transactions") {
      const header = "txn_date,direction,amount_minor,currency,description,journal_entry_id"
      const lines = transactions.map((row) =>
        [row.txn_date, row.direction, row.amount_minor, row.currency_code, row.description ?? "", row.journal_entry_id ?? ""]
          .map((value) => `"${value}"`)
          .join(",")
      )
      download([header, ...lines].join("\n"), "cash-transactions.csv")
    } else {
      const header = "txn_date,currency,cash_in_minor,cash_out_minor,net_minor"
      const lines = position.map((row) =>
        [row.txn_date, row.currency_code, row.cash_in_minor, row.cash_out_minor, row.net_minor].join(",")
      )
      download([header, ...lines].join("\n"), "cash-position.csv")
    }
  }, [position, tab, transactions])

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("finance.cash.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("finance.cash.description")}</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={loading}>
          {t("common.action.export_excel")}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
        <div className="space-y-1.5">
          <Label>{t("finance.cash.field.direction")}</Label>
          <select
            className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={direction}
            onChange={(e) => setDirection(e.target.value as "IN" | "OUT")}
          >
            <option value="IN">{t("finance.cash.direction.IN")}</option>
            <option value="OUT">{t("finance.cash.direction.OUT")}</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("finance.cash.field.date")}</Label>
          <Input type="date" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("finance.cash.field.amount")}</Label>
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("finance.cash.field.description")}</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button onClick={() => void submit()}>{t("common.action.create")}</Button>
      </div>

      <div className="flex gap-2">
        {(["transactions", "position"] as TabKey[]).map((value) => (
          <button
            key={value}
            type="button"
            className={
              value === tab
                ? "rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                : "rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/60"
            }
            onClick={() => setTab(value)}
          >
            {t(`finance.cash.tab.${value}`)}
          </button>
        ))}
      </div>

      {loadFailed && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {t("finance.cash.load_failed")}
        </div>
      )}

      {tab === "transactions" && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{t("finance.cash.field.date")}</th>
                <th className="px-3 py-2">{t("finance.cash.field.direction")}</th>
                <th className="px-3 py-2 text-right">{t("finance.cash.field.amount")}</th>
                <th className="px-3 py-2">{t("finance.cash.field.description")}</th>
                <th className="px-3 py-2">{t("finance.field.journal")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                    {t("common.loading")}
                  </td>
                </tr>
              )}
              {!loading && transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                    {t("finance.cash.empty")}
                  </td>
                </tr>
              )}
              {transactions.map((row, index) => (
                <tr key={`${row.txn_date}-${index}`} className="border-t border-border">
                  <td className="whitespace-nowrap px-3 py-2">{formatDateShort(row.txn_date)}</td>
                  <td className="px-3 py-2">
                    <Badge variant={row.direction === "IN" ? "default" : "outline"}>
                      {t(`finance.cash.direction.${row.direction}`)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatAmount(fromMinor(row.amount_minor, row.currency_code), row.currency_code)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{row.description || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {row.journal_entry_id ? row.journal_entry_id.slice(0, 8) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "position" && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{t("finance.cash.field.date")}</th>
                <th className="px-3 py-2">{t("common.field.currency")}</th>
                <th className="px-3 py-2 text-right">{t("finance.cash.col.cash_in")}</th>
                <th className="px-3 py-2 text-right">{t("finance.cash.col.cash_out")}</th>
                <th className="px-3 py-2 text-right">{t("finance.cash.col.net")}</th>
              </tr>
            </thead>
            <tbody>
              {!loading && position.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                    {t("finance.cash.empty")}
                  </td>
                </tr>
              )}
              {position.map((row) => (
                <tr key={`${row.txn_date}-${row.currency_code}`} className="border-t border-border">
                  <td className="whitespace-nowrap px-3 py-2">{formatDateShort(row.txn_date)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.currency_code}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatAmount(fromMinor(row.cash_in_minor, row.currency_code), row.currency_code)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatAmount(fromMinor(row.cash_out_minor, row.currency_code), row.currency_code)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {formatAmount(fromMinor(row.net_minor, row.currency_code), row.currency_code)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function download(csv: string, filename: string) {
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
