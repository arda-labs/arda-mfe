import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
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
import { SelectField } from "@workspace/ui/components/select-field"
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
  const { t } = useI18n()
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
      notify.error(t("statistical.submissions.validation.required"))
      return
    }
    setSavePending(true)
    try {
      await statisticalApi.createSubmission({
        report_code: form.report_code,
        period_code: form.period_code,
      })
      notify.success(t("statistical.submissions.create_success"))
      onOpenChange(false)
      setForm(emptyForm)
      await onSaved()
    } catch {
      notify.error(t("statistical.submissions.create_failed"))
    } finally {
      setSavePending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("statistical.submissions.create_title")}</DialogTitle>
          <DialogDescription>
            {t("statistical.submissions.create_description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t("statistical.submissions.field.report")}</Label>
            <SelectField
              value={form.report_code}
              onChange={(e) => setForm((c) => ({ ...c, report_code: e.target.value }))}
              placeholder={t("statistical.placeholder.select")}
              options={definitions.map((d) => ({ value: d.code, code: d.code, label: d.name }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("statistical.submissions.field.period")}</Label>
            <Input
              value={form.period_code}
              placeholder="2026-09"
              onChange={(e) => setForm((c) => ({ ...c, period_code: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.action.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={savePending}>
            {t("common.action.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
