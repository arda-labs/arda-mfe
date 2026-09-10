import { useEffect, useState } from "react"
import { Check, MessageSquareWarning, X } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import type { WorkItem } from "../api"

export type ReviewDecision = "APPROVE" | "REQUEST_CHANGES" | "REJECT"

/**
 * Generic approve / request-changes / reject dialog for case types whose
 * domain remote does not embed the approval action yet (FIN posting flows,
 * HRM registration, LNM adjustments/batches, DPM settle, RPT submit).
 * Sends both `decision` (BPMN condition variable) and `reviewDecision`
 * (backend notification/side-effect compatibility).
 */
export function DecisionDialog({
  item,
  submitting,
  onClose,
  onConfirm,
}: {
  item: WorkItem | null
  submitting: boolean
  onClose: () => void
  onConfirm: (decision: ReviewDecision, comment: string) => void
}) {
  const { t } = useI18n()
  const [comment, setComment] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    setComment("")
    setError("")
  }, [item?.id])

  function confirm(decision: ReviewDecision) {
    const trimmed = comment.trim()
    if (decision !== "APPROVE" && !trimmed) {
      setError(t("workflow.workbench.decision_comment_required"))
      return
    }
    setError("")
    onConfirm(decision, trimmed)
  }

  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open && !submitting) onClose()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("workflow.workbench.decision_title")}
          </DialogTitle>
          <DialogDescription>
            {item ? `${item.caseCode} — ${item.title}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="decision-comment">
            {t("workflow.workbench.decision_comment_label")}
          </Label>
          <Textarea
            id="decision-comment"
            rows={3}
            value={comment}
            disabled={submitting}
            placeholder={t(
              "workflow.workbench.decision_comment_placeholder"
            )}
            onChange={(event) => setComment(event.target.value)}
          />
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => confirm("REQUEST_CHANGES")}
          >
            <MessageSquareWarning className="size-4" />
            {t("workflow.workbench.decision_request_changes")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={submitting}
            onClick={() => confirm("REJECT")}
          >
            <X className="size-4" />
            {t("workflow.workbench.decision_reject")}
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => confirm("APPROVE")}
          >
            <Check className="size-4" />
            {t("workflow.workbench.decision_approve")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
