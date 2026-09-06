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
import { statisticalApi, type ReportDefinition } from "../../api"

type Form = {
  report_code: string
  period_code: string
}

const emptyForm: Form = {
  report_code: "",
  period_code: "",
}

/** Create submission (DRAFT) for a report period. */
export function CreateSubmissionDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void> | void
}) {
  const [form, setForm] = useState<Form>(emptyForm)
  const [definitions, setDefinitions] = useState<ReportDefinition[]>([])
  const [savePending, setSavePending] = useState(false)

  useEffect(() => {
    if (!open) return
    void statisticalApi
      .listReportDefinitions()
      .then((result) => setDefinitions(result.items))
      .catch(() => setDefinitions([]))
  }, [open])

  const submit = async () => {
    if (!form.report_code || !form.period_code) {
      notify.error("Chọn báo cáo và kỳ nộp")
      return
    }
    setSavePending(true)
    try {
      await statisticalApi.createSubmission({
        report_code: form.report_code,
        period_code: form.period_code,
      })
      notify.success("Đã tạo kỳ nộp báo cáo (DRAFT)")
      onOpenChange(false)
      setForm(emptyForm)
      await onSaved()
    } catch {
      notify.error("Không thể tạo kỳ nộp")
    } finally {
      setSavePending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo kỳ nộp báo cáo</DialogTitle>
          <DialogDescription>
            Chọn mẫu báo cáo và kỳ ("2026-09"). Sau khi tạo, trình duyệt qua
            workbench.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Báo cáo</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.report_code}
              onChange={(e) => setForm((c) => ({ ...c, report_code: e.target.value }))}
            >
              <option value="">— chọn —</option>
              {definitions.map((d) => (
                <option key={d.id} value={d.code}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Kỳ (YYYY-MM)</Label>
            <Input
              value={form.period_code}
              placeholder="2026-09"
              onChange={(e) => setForm((c) => ({ ...c, period_code: e.target.value }))}
            />
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
