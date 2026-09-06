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
import { depositApi, type SavingsProduct } from "../../api"

type Form = {
  savings_code: string
  customer_code: string
  product_code: string
  open_date: string
  amount: string
  currency_code: string
}

const emptyForm: Form = {
  savings_code: "",
  customer_code: "",
  product_code: "",
  open_date: "",
  amount: "",
  currency_code: "VND",
}

/** Open-savings dialog: pick product, type customer + principal (minor via toMinor). */
export function OpenSavingsDialog({
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
    open_date: todayISO(),
  }))
  const [products, setProducts] = useState<SavingsProduct[]>([])
  const [savePending, setSavePending] = useState(false)

  useEffect(() => {
    if (!open) return
    void depositApi
      .listProducts()
      .then((result) => setProducts(result.items))
      .catch(() => setProducts([]))
  }, [open])

  const submit = async () => {
    const amountMinor = toMinor(Number(form.amount) || 0, form.currency_code)
    if (!form.savings_code || !form.customer_code || !form.product_code || amountMinor <= 0) {
      notify.error("Nhập đủ mã sổ, khách hàng, sản phẩm và số tiền dương")
      return
    }
    setSavePending(true)
    try {
      await depositApi.openSavings({
        savings_code: form.savings_code,
        customer_code: form.customer_code,
        product_code: form.product_code,
        open_date: form.open_date,
        principal_minor: amountMinor,
        currency_code: form.currency_code,
      })
      notify.success("Đã mở sổ")
      onOpenChange(false)
      setForm({ ...emptyForm, open_date: todayISO() })
      await onSaved()
    } catch {
      notify.error("Không thể mở sổ")
    } finally {
      setSavePending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mở sổ tiết kiệm</DialogTitle>
          <DialogDescription>
            Chọn sản phẩm (kỳ hạn + lãi suất), nhập số tiền gửi ban đầu.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Mã sổ</Label>
              <Input
                value={form.savings_code}
                onChange={(e) => setForm((c) => ({ ...c, savings_code: e.target.value }))}
                placeholder="VD: SV-2026-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Khách hàng</Label>
              <Input
                value={form.customer_code}
                onChange={(e) => setForm((c) => ({ ...c, customer_code: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Sản phẩm</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.product_code}
              onChange={(e) => setForm((c) => ({ ...c, product_code: e.target.value }))}
            >
              <option value="">— chọn —</option>
              {products.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.code} — {p.name} ({p.term_months} tháng, {p.interest_rate}%)
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Số tiền</Label>
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
            <div className="space-y-1.5">
              <Label>Ngày mở</Label>
              <Input
                type="date"
                value={form.open_date}
                onChange={(e) => setForm((c) => ({ ...c, open_date: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={() => void submit()} disabled={savePending}>
            Mở sổ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
