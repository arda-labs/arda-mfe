import { useEffect, useState } from "react"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { formatAmount, fromMinor, isValidISODate, todayISO, toMinor } from "@workspace/format"
import {
  postingApi,
  type PostingPreviewInput,
  type ValidationResult,
} from "../../api"

type PreviewForm = {
  document_type: string
  accounting_date: string
  currency_code: string
  classification_debit: string
  classification_credit: string
  amount: string
  contract_code: string
  org_unit_code: string
}

const emptyForm: PreviewForm = {
  document_type: "LNM_DISBURSEMENT",
  accounting_date: "",
  currency_code: "VND",
  classification_debit: "LNM_LOAN_PRINCIPAL",
  classification_credit: "FUND_DISBURSEMENT_IN_TRANSIT",
  amount: "",
  contract_code: "",
  org_unit_code: "",
}

/** Posting preview (contract §8.3): resolves both lines against the COA and
 * shows account code/name + errors before any posting is submitted. */
export function PostingPreviewDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [form, setForm] = useState<PreviewForm>(() => ({
    ...emptyForm,
    accounting_date: todayISO(),
  }))
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (open) setResult(null)
  }, [open])

  const runPreview = async () => {
    const amountMinor = toMinor(Number(form.amount) || 0, form.currency_code)
    if (!isValidISODate(form.accounting_date) || amountMinor <= 0) {
      notify.error("Cần ngày kế toán hợp lệ và số tiền dương")
      return
    }
    const input: PostingPreviewInput = {
      accounting_date: form.accounting_date,
      currency_code: form.currency_code,
      document_type: form.document_type,
      lines: [
        {
          line_no: 1,
          direction: "DEBIT",
          amount_minor: amountMinor,
          analytics: {
            acc_classification: form.classification_debit,
            contract_code: form.contract_code,
            org_unit_code: form.org_unit_code,
          },
        },
        {
          line_no: 2,
          direction: "CREDIT",
          amount_minor: amountMinor,
          analytics: {
            acc_classification: form.classification_credit,
            contract_code: form.contract_code,
            org_unit_code: form.org_unit_code,
          },
        },
      ],
    }
    setPending(true)
    try {
      const result = await postingApi.validate(input)
      setResult(result)
    } catch {
      notify.error("Không thể validate bút toán")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Preview bút toán</DialogTitle>
          <DialogDescription>
            Resolve tài khoản theo COA + kiểm tra cân — chưa ghi sổ. Post thật
            đi qua PostingService khi duyệt case.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Loại CT</Label>
            <Input
              value={form.document_type}
              onChange={(e) => setForm((c) => ({ ...c, document_type: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Ngày KT</Label>
            <Input
              type="date"
              value={form.accounting_date}
              onChange={(e) => setForm((c) => ({ ...c, accounting_date: e.target.value }))}
            />
          </div>
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
              onChange={(e) => setForm((c) => ({ ...c, currency_code: e.target.value.toUpperCase() }))}
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Classification (Nợ)</Label>
            <Input
              value={form.classification_debit}
              onChange={(e) => setForm((c) => ({ ...c, classification_debit: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Classification (Có)</Label>
            <Input
              value={form.classification_credit}
              onChange={(e) => setForm((c) => ({ ...c, classification_credit: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Hợp đồng</Label>
            <Input
              value={form.contract_code}
              onChange={(e) => setForm((c) => ({ ...c, contract_code: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Đơn vị</Label>
            <Input
              value={form.org_unit_code}
              onChange={(e) => setForm((c) => ({ ...c, org_unit_code: e.target.value }))}
            />
          </div>
        </div>

        {result ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={result.valid ? "default" : "destructive"}>
                {result.valid ? "Hợp lệ" : "Có lỗi"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                COA version: {result.coa_version_id || "—"}
              </span>
              {result.global_errors.length > 0 && (
                <span className="text-xs text-destructive">
                  {result.global_errors.join(", ")}
                </span>
              )}
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Nợ/Có</TableHead>
                    <TableHead>Tài khoản</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead>Lỗi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.lines.map((line) => (
                    <TableRow key={line.line_no}>
                      <TableCell>{line.line_no}</TableCell>
                      <TableCell>
                        <Badge variant={line.direction === "DEBIT" ? "secondary" : "outline"}>
                          {line.direction}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {line.resolved ? (
                          <span>
                            <span className="font-mono text-xs">{line.account_code}</span>{" "}
                            {line.account_name}
                          </span>
                        ) : (
                          <span className="text-destructive">Không resolve</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(
                          fromMinor(line.amount_minor, line.currency_code),
                          line.currency_code
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-destructive">
                        {line.errors.join(", ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button onClick={() => void runPreview()} disabled={pending}>
            {pending ? "Đang resolve…" : "Preview"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
