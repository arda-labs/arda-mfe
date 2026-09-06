import { useEffect, useState } from "react"
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
import { toMinor, todayISO } from "@workspace/format"
import { capitalApi, type FundType } from "../../api"

type Form = {
  contract_code: string
  fund_type_code: string
  counterparty_code: string
  contract_date: string
  amount: string
  currency_code: string
}

const emptyForm: Form = {
  contract_code: "",
  fund_type_code: "",
  counterparty_code: "",
  contract_date: "",
  amount: "",
  currency_code: "VND",
}

/** Create fund contract (CFM). */
export function CreateContractDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void> | void
}) {
  const [form, setForm] = useState<Form>(() => ({
    ...emptyForm,
    contract_date: todayISO(),
  }))
  const [fundTypes, setFundTypes] = useState<FundType[]>([])
  const [savePending, setSavePending] = useState(false)

  useEffect(() => {
    if (!open) return
    void capitalApi
      .listFundTypes()
      .then((result) => setFundTypes(result.items))
      .catch(() => setFundTypes([]))
  }, [open])

  const submit = async () => {
    const amountMinor = toMinor(Number(form.amount) || 0, form.currency_code)
    if (!form.contract_code || !form.fund_type_code || amountMinor <= 0) {
      notify.error("Nhập đủ mã HĐ, loại vốn, số vốn dương")
      return
    }
    setSavePending(true)
    try {
      await capitalApi.createContract({
        contract_code: form.contract_code,
        fund_type_code: form.fund_type_code,
        counterparty_code: form.counterparty_code,
        contract_date: form.contract_date,
        amount_minor: amountMinor,
        currency_code: form.currency_code,
      })
      notify.success("Đã tạo hợp đồng vốn")
      onOpenChange(false)
      setForm({ ...emptyForm, contract_date: todayISO() })
      await onSaved()
    } catch {
      notify.error("Không thể tạo hợp đồng vốn")
    } finally {
      setSavePending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm hợp đồng vốn</DialogTitle>
          <DialogDescription>
            Hình thành hợp đồng vốn với loại vốn và hạn mức.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Mã HĐ</Label>
              <Input
                value={form.contract_code}
                onChange={(e) => setForm((c) => ({ ...c, contract_code: e.target.value }))}
                placeholder="VD: CFC-2026-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Loại vốn</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.fund_type_code}
                onChange={(e) => setForm((c) => ({ ...c, fund_type_code: e.target.value }))}
              >
                <option value="">— chọn —</option>
                {fundTypes.map((t) => (
                  <option key={t.id} value={t.code}>
                    {t.code} — {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Đối tác</Label>
              <Input
                value={form.counterparty_code}
                onChange={(e) => setForm((c) => ({ ...c, counterparty_code: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ngày HĐ</Label>
              <Input
                type="date"
                value={form.contract_date}
                onChange={(e) => setForm((c) => ({ ...c, contract_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Số vốn</Label>
              <Input
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Loại tiền</Label>
              <Input
                value={form.currency_code}
                maxLength={3}
                onChange={(e) => setForm((c) => ({ ...c, currency_code: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={() => void submit()} disabled={savePending}>
            Tạo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
