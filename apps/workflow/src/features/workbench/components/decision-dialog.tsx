import { useEffect, useState } from "react"
import { Check, MessageSquareWarning, X } from "lucide-react"
import { useCaseTabs } from "@workspace/case-tabs"
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Textarea } from "@workspace/ui/components/textarea"
import type { WorkItem } from "../api"

export type ReviewDecision = "APPROVE" | "REQUEST_CHANGES" | "REJECT" | "SUBMIT"

const DEFAULT_ACTIONS: ReviewDecision[] = ["APPROVE", "REQUEST_CHANGES", "REJECT"]

function isReviewDecision(value: string): value is ReviewDecision {
  return (
    value === "APPROVE" ||
    value === "REQUEST_CHANGES" ||
    value === "REJECT" ||
    value === "SUBMIT"
  )
}

/**
 * Generic approve / request-changes / reject dialog for case types whose
 * domain remote does not embed the approval action yet (FIN posting flows,
 * HRM registration, LNM adjustments/batches, DPM settle, RPT submit).
 * Sends both `decision` (BPMN condition variable) and `reviewDecision`
 * (backend notification/side-effect compatibility).
 *
 * The action set comes from the server registry (`allowedActions`): maker
 * steps only expose SUBMIT, checker steps expose their real branches. When the
 * server sends no metadata (legacy rows) the dialog keeps the full set as a
 * transition period.
 */
export function DecisionDialog({
  item,
  submitting,
  onClose,
  onConfirm,
  allowedActions,
  requiredCommentOn,
}: {
  item: WorkItem | null
  submitting: boolean
  onClose: () => void
  onConfirm: (decision: ReviewDecision, comment: string) => void
  allowedActions?: string[]
  requiredCommentOn?: string[]
}) {
  const { t } = useI18n()
  const [comment, setComment] = useState("")
  const [error, setError] = useState("")

  const actions: ReviewDecision[] =
    allowedActions && allowedActions.length > 0
      ? allowedActions.filter(isReviewDecision)
      : DEFAULT_ACTIONS

  function requiresComment(decision: ReviewDecision) {
    if (requiredCommentOn && requiredCommentOn.length > 0) {
      return requiredCommentOn.includes(decision)
    }
    return decision !== "APPROVE" && decision !== "SUBMIT"
  }

  // Checker context: the maker's attachments ("Hồ sơ đính kèm") and the case
  // timeline ("Lưu vết tác vụ") — view-only, the dialog never mutates the case
  // dossier (EPAS approve mode). Labels come from the shared common bundle.
  const caseTabs = useCaseTabs({
    caseId: item?.caseId,
    canUpload: false,
  })

  useEffect(() => {
    setComment("")
    setError("")
  }, [item?.id])

  function confirm(decision: ReviewDecision) {
    const trimmed = comment.trim()
    if (requiresComment(decision) && !trimmed) {
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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("workflow.workbench.decision_title")}</DialogTitle>
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
            placeholder={t("workflow.workbench.decision_comment_placeholder")}
            onChange={(event) => setComment(event.target.value)}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        {item?.caseId && caseTabs.length > 0 ? (
          <Tabs
            defaultValue={caseTabs[0]?.id}
            className="flex flex-col gap-2 pt-2"
          >
            <TabsList className="h-auto w-fit">
              {caseTabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {caseTabs.map((tab) => (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="mt-0 max-h-80 overflow-y-auto"
              >
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        ) : null}
        <DialogFooter className="gap-2 sm:justify-end">
          {actions.includes("REQUEST_CHANGES") ? (
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => confirm("REQUEST_CHANGES")}
            >
              <MessageSquareWarning className="size-4" />
              {t("workflow.workbench.decision_request_changes")}
            </Button>
          ) : null}
          {actions.includes("REJECT") ? (
            <Button
              type="button"
              variant="destructive"
              disabled={submitting}
              onClick={() => confirm("REJECT")}
            >
              <X className="size-4" />
              {t("workflow.workbench.decision_reject")}
            </Button>
          ) : null}
          {actions.includes("SUBMIT") ? (
            <Button
              type="button"
              disabled={submitting}
              onClick={() => confirm("SUBMIT")}
            >
              <Check className="size-4" />
              {t("workflow.workbench.decision_submit")}
            </Button>
          ) : null}
          {actions.includes("APPROVE") ? (
            <Button
              type="button"
              disabled={submitting}
              onClick={() => confirm("APPROVE")}
            >
              <Check className="size-4" />
              {t("workflow.workbench.decision_approve")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
