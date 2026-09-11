import { useCallback, useEffect, useMemo, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { formatDateShort } from "@workspace/format"
import { postingApi, type JournalEntry } from "../api"

const FUND_CODES = [
  "DEV",
  "FIN_RESERVE",
  "OP_SUPPLEMENT",
  "BONUS_MANAGER",
  "BONUS_STAFF",
  "WELFARE_FIXED",
  "WELFARE_BOD",
] as const

type FundTab = "APPROPRIATION" | "UTILIZATION"

const DOC_TYPE: Record<FundTab, string> = {
  APPROPRIATION: "FIN_FUND_APPROP",
  UTILIZATION: "FIN_FUND_USE",
}

function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

/** Quỹ: trích lập / sử dụng (FIN_FUND_APPROP_V2 / FIN_FUND_USE_V2). */
export function FundsPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<FundTab>("APPROPRIATION")
  const [rows, setRows] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [fundCode, setFundCode] = useState<string>("DEV")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(today())
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await postingApi.listJournalPaged({
        document_type: DOC_TYPE[tab],
        perPage: 50,
      })
      setRows(res.items ?? [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async () => {
    const amountMinor = Math.round(Number(amount) * 100)
    if (!fundCode || !amountMinor || amountMinor <= 0) {
      notify.error(t("finance.funds.validation.required"))
      return
    }
    setSaving(true)
    try {
      const res = await postingApi.createFundCase({
        accounting_date: date,
        action: tab,
        fund_code: fundCode,
        amount_minor: amountMinor,
        description: description.trim() || undefined,
      })
      notify.success(t("finance.funds.toast.created", { code: res.case_code }))
      setOpen(false)
      setAmount("")
      setDescription("")
      await load()
    } catch (err) {
      notify.error(
        t("finance.funds.toast.failed"),
        err instanceof Error ? err.message : String(err)
      )
    } finally {
      setSaving(false)
    }
  }

  const tabs = useMemo(
    () => ["APPROPRIATION", "UTILIZATION"] as FundTab[],
    []
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("finance.funds.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("finance.funds.description")}
          </p>
        </div>
        <Button size="sm" className="text-xs" onClick={() => setOpen(true)}>
          {tab === "APPROPRIATION"
            ? t("finance.funds.action.appropriate")
            : t("finance.funds.action.utilize")}
        </Button>
      </div>

      <div className="flex gap-2">
        {tabs.map((value) => (
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
            {t(`finance.funds.tab.${value}`)}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("finance.journal.field.entry_no")}</th>
              <th className="px-3 py-2">{t("finance.journal.field.accounting_date")}</th>
              <th className="px-3 py-2">{t("finance.journal.field.description")}</th>
              <th className="px-3 py-2">{t("common.field.status")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                  {t("common.loading")}
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                  {t("finance.funds.empty")}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.entry_no} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">
                  JE-{String(row.entry_no).padStart(6, "0")}
                </td>
                <td className="px-3 py-2">{formatDateShort(row.accounting_date)}</td>
                <td className="max-w-[420px] truncate px-3 py-2">{row.description || "—"}</td>
                <td className="px-3 py-2">
                  <Badge variant={row.status === "POSTED" ? "default" : "outline"}>
                    {row.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {tab === "APPROPRIATION"
                ? t("finance.funds.action.appropriate")
                : t("finance.funds.action.utilize")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("finance.funds.field.fund")}</Label>
              <Select value={fundCode} onValueChange={setFundCode}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUND_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {t(`finance.funds.fund.${code}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("finance.funds.field.amount")}</Label>
              <Input
                className="h-8 text-xs"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("finance.funds.field.date")}</Label>
              <Input
                type="date"
                className="h-8 w-44 text-xs"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("finance.funds.field.description")}</Label>
              <Input
                className="h-8 text-xs"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.action.cancel")}
            </Button>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving ? t("common.action.saving") : t("common.action.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
