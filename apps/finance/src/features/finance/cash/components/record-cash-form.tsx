import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { toMinor } from "@workspace/format"
import { recordCash } from "../../api"

function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

/** Record a cash receipt/payment — the create path behind the transactions tab. */
export function RecordCashForm({
  onRecorded,
}: {
  onRecorded: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [direction, setDirection] = useState<"IN" | "OUT">("IN")
  const [txnDate, setTxnDate] = useState(today())
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const amountMinor = toMinor(Number(amount) || 0, "VND")
    if (amountMinor <= 0 || !txnDate) {
      notify.error(t("finance.cash.validation.required"))
      return
    }
    setSaving(true)
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
      await onRecorded()
    } catch {
      notify.error(t("finance.cash.save_failed"))
    } finally {
      setSaving(false)
    }
  }

  return (
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
      <Button onClick={() => void submit()} disabled={saving}>
        {t("common.action.create")}
      </Button>
    </div>
  )
}
