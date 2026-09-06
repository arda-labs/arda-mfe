import { useEffect, useState } from "react"
import { useI18n, translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { parseMoneyInput, todayISO, toMinor } from "@workspace/format"
import { loanApi, collectionApi, type LoanContract } from "../../api"

type Form = {
  contract_code: string
  agreement_code: string
  collection_date: string
  principal: string
  interest: string
  currency_code: string
}

const emptyForm: Form = {
  contract_code: "",
  agreement_code: "",
  collection_date: "",
  principal: "",
  interest: "",
  currency_code: "VND",
}

/** Create-dialog: pick an ACTIVE contract, type agreement code, split
 * principal + interest amounts (minor units via toMinor). */
export function CollectionCreateDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [form, setForm] = useState<Form>(() => ({
    ...emptyForm,
    collection_date: todayISO(),
  }))
  const [contracts, setContracts] = useState<LoanContract[]>([])
  const [savePending, setSavePending] = useState(false)

  useEffect(() => {
    if (!open) return
    void loanApi
      .listContracts({ status: "ACTIVE" })
      .then((result) => setContracts(result.items))
      .catch(() => setContracts([]))
  }, [open])

  const submit = async () => {
    const principalMinor = toMinor(parseMoneyInput(form.principal) ?? 0, form.currency_code)
    const interestMinor = toMinor(parseMoneyInput(form.interest) ?? 0, form.currency_code)
    if (!form.contract_code || !form.agreement_code) {
      notify.error("Chọn hợp đồng và nhập mã hợp đồng giải ngân")
      return
    }
    if (principalMinor <= 0 && interestMinor <= 0) {
      notify.error("Gốc hoặc lãi phải dương")
      return
    }
    setSavePending(true)
    try {
      await collectionApi.create({
        contract_code: form.contract_code,
        agreement_code: form.agreement_code,
        collection_date: form.collection_date,
        principal_minor: principalMinor,
        interest_minor: interestMinor,
        currency_code: form.currency_code,
      })
      notify.success("Đã tạo phiếu thu nợ (DRAFT)")
      onOpenChange(false)
      setForm({ ...emptyForm, collection_date: todayISO() })
      await onSaved()
    } catch (error) {
      notify.error(translateApiError(error, "Không thể tạo thu nợ"))
    } finally {
      setSavePending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm thu nợ</DialogTitle>
          <DialogDescription>
            Thu gốc + lãi theo hợp đồng giải ngân. Sau khi tạo, trình duyệt
            qua workbench — duyệt xong bút toán tự post.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Hợp đồng tín dụng (ACTIVE)</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.contract_code}
              onChange={(e) => setForm((c) => ({ ...c, contract_code: e.target.value }))}
            >
              <option value="">— chọn —</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.contract_code}>
                  {c.contract_code} — {c.customer_code}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Mã hợp đồng giải ngân</Label>
            <Input
              value={form.agreement_code}
              onChange={(e) => setForm((c) => ({ ...c, agreement_code: e.target.value }))}
              placeholder="VD: AG-2026-001"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Thu gốc</Label>
              <Input
                inputMode="decimal"
                value={form.principal}
                onChange={(e) => setForm((c) => ({ ...c, principal: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Thu lãi</Label>
              <Input
                inputMode="decimal"
                value={form.interest}
                onChange={(e) => setForm((c) => ({ ...c, interest: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ngày thu</Label>
              <Input
                type="date"
                value={form.collection_date}
                onChange={(e) => setForm((c) => ({ ...c, collection_date: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("loan.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={savePending}>
            {t("loan.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
