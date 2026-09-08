import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { buttonVariants } from "@workspace/ui/components/button"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

export type CheckerDecision = "APPROVE" | "REQUEST_CHANGES" | "REJECT"

const decisionCopy: Record<
  Exclude<CheckerDecision, "APPROVE">,
  { titleKey: string; descriptionKey: string; confirmKey: string; destructive?: boolean }
> = {
  REQUEST_CHANGES: {
    titleKey: "crm.customers.checker.request_changes_title",
    descriptionKey: "crm.customers.checker.request_changes_description",
    confirmKey: "crm.customers.checker.request_changes_confirm",
  },
  REJECT: {
    titleKey: "crm.customers.checker.reject_title",
    descriptionKey: "crm.customers.checker.reject_description",
    confirmKey: "crm.customers.checker.reject_confirm",
    destructive: true,
  },
}

export function CheckerDecisionDialog({
  decision,
  open,
  submitting,
  onOpenChange,
  onConfirm,
}: {
  decision: Exclude<CheckerDecision, "APPROVE"> | null
  open: boolean
  submitting?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (comment: string) => void
}) {
  const [comment, setComment] = useState("")
  const { t } = useI18n()
  const copy = decision ? decisionCopy[decision] : null
  const trimmed = comment.trim()

  useEffect(() => {
    if (!open) setComment("")
  }, [open, decision])

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setComment("")
        onOpenChange(next)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy ? t(copy.titleKey) : ""}</AlertDialogTitle>
          <AlertDialogDescription>
            {copy ? t(copy.descriptionKey) : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <label
            className="text-sm font-medium"
            htmlFor="checker-review-comment"
          >
            {t("crm.customers.checker.reason_label")}{" "}
            <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="checker-review-comment"
            rows={4}
            value={comment}
            disabled={submitting}
            placeholder={t("crm.customers.checker.reason_placeholder")}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>
            {t("crm.customers.checker.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={submitting || !trimmed}
            className={cn(
              copy?.destructive && buttonVariants({ variant: "destructive" })
            )}
            onClick={(e) => {
              e.preventDefault()
              if (!trimmed || submitting) return
              onConfirm(trimmed)
            }}
          >
            {copy ? t(copy.confirmKey) : ""}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
