import { useState } from "react"
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
import { postingApi, type PostingFlow } from "../api"

/** Upload an XLSX posting sheet → creates a manual posting case. */
export function ImportPostingDialog({
  open,
  onOpenChange,
  flow,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  flow: PostingFlow
  onImported: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [accountingDate, setAccountingDate] = useState("")
  const [pending, setPending] = useState(false)

  const submit = async () => {
    if (!file) {
      notify.error(t("finance.posting.import.file_required"))
      return
    }
    setPending(true)
    try {
      const res = await postingApi.importPostingCases({
        file,
        flow,
        accountingDate: accountingDate || undefined,
      })
      notify.success(
        t("finance.posting.import.success", {
          code: res.case_code,
          count: res.line_count,
        })
      )
      setFile(null)
      setAccountingDate("")
      onOpenChange(false)
      await onImported()
    } catch (err) {
      notify.error(
        t("finance.posting.import.failed"),
        err instanceof Error ? err.message : String(err)
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {t("finance.posting.import.title")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("finance.posting.import.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs">
              {t("finance.posting.import.field.file")}
            </Label>
            <Input
              type="file"
              accept=".xlsx"
              className="h-8 text-xs"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              {t("finance.posting.import.field.accounting_date")}
            </Label>
            <Input
              type="date"
              className="h-8 w-44 text-xs"
              value={accountingDate}
              onChange={(e) => setAccountingDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {t("common.action.cancel")}
          </Button>
          <Button
            size="sm"
            className="text-xs"
            disabled={pending || !file}
            onClick={submit}
          >
            {pending ? t("common.action.saving") : t("finance.posting.import.btn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
