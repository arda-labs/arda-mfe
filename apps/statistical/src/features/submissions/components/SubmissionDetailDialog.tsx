import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { statisticalApi, type ReportSubmission } from "../../api"

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "object") return JSON.stringify(value, null, 2)
  return String(value)
}

/** Read-only detail of one report submission. */
export function SubmissionDetailDialog({
  open,
  onOpenChange,
  submissionId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  submissionId: string | null
}) {
  const { t } = useI18n()
  const [item, setItem] = useState<ReportSubmission | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !submissionId) {
      setItem(null)
      return
    }
    let cancelled = false
    setLoading(true)
    statisticalApi
      .getSubmission(submissionId)
      .then((data) => {
        if (!cancelled) setItem(data)
      })
      .catch(() => {
        if (!cancelled) setItem(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, submissionId])

  const entries = item
    ? Object.entries(item).filter(([, value]) => value !== undefined)
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("statistical.submissions.detail_title")}</DialogTitle>
          <DialogDescription>
            {t("statistical.submissions.detail_description")}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("common.loading")}
          </p>
        ) : entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("statistical.submissions.detail_empty")}
          </p>
        ) : (
          <dl className="space-y-2 text-sm">
            {entries.map(([key, value]) => (
              <div key={key} className="grid grid-cols-[160px_1fr] gap-2">
                <dt className="font-mono text-xs text-muted-foreground">
                  {key}
                </dt>
                <dd className="break-words whitespace-pre-wrap">
                  {formatValue(value)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  )
}
