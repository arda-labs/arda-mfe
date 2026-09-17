import { useI18n } from "@workspace/i18n"
import { ArrowLeft, Check, RotateCcw, Save, Send, X } from "lucide-react"
import { Button } from "@workspace/ui/components/button"

/**
 * Sticky footer bars shared by the customer registration/adjustment pages:
 * a back-only bar (loading / missing-context screens) and the business action
 * bar (maker save/submit, checker approve / request changes / reject).
 */
export function FooterBackButton({ onBack }: { onBack: () => void }) {
  const { t } = useI18n()
  return (
    <div className="flex h-13 shrink-0 items-center justify-end border-t bg-background px-4">
      <Button className="h-8" type="button" variant="outline" onClick={onBack}>
        <ArrowLeft className="size-4" />
        {t("common.action.back")}
      </Button>
    </div>
  )
}

export function FooterActions({
  isReadonly,
  isSubmitting,
  canCancelDraft,
  canCompleteTask,
  canEditTask,
  awaitingMakerResubmit = false,
  canEdit = false,
  canSubmit,
  onApprove,
  onRequestChanges,
  onReject,
  onCancel,
  onBack,
  onSaveDraft,
  onSaveAndSubmit,
  onSaveAndRevise,
  onSaveAndComplete,
  onCancelDraft,
  onCompleteTask,
}: {
  isReadonly: boolean
  isSubmitting: boolean
  canCancelDraft: boolean
  canCompleteTask: boolean
  canEditTask: boolean
  awaitingMakerResubmit?: boolean
  canEdit?: boolean
  canSubmit?: boolean
  onApprove?: () => void
  onRequestChanges?: () => void
  onReject?: () => void
  onCancel?: () => void
  onBack: () => void
  onSaveDraft: () => void
  onSaveAndSubmit?: () => void
  onSaveAndRevise?: () => void
  onSaveAndComplete?: () => void
  onCancelDraft?: () => void
  onCompleteTask?: (decision: string) => void
}) {
  const { t } = useI18n()
  const showMakerActions =
    (canEditTask || awaitingMakerResubmit || canEdit) && !canCompleteTask
  const showCheckerActions = canCompleteTask

  return (
    <div className="flex h-13 shrink-0 items-center border-t bg-background px-4">
      <div className="flex w-full flex-wrap justify-end gap-2">
        {showCheckerActions && (onApprove || onCompleteTask) ? (
          onCompleteTask ? (
            <>
              <Button
                className="h-8"
                type="button"
                disabled={isSubmitting}
                onClick={() => onCompleteTask("APPROVE")}
              >
                <Check className="size-4" />
                {t("crm.customers.actions.approve")}
              </Button>
              <Button
                className="h-8"
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => onCompleteTask("REQUEST_CHANGES")}
              >
                <RotateCcw className="size-4" />
                {t("crm.customers.actions.request_changes")}
              </Button>
              <Button
                className="h-8"
                type="button"
                variant="destructive"
                disabled={isSubmitting}
                onClick={() => onCompleteTask("REJECT")}
              >
                <X className="size-4" />
                {t("crm.customers.actions.reject")}
              </Button>
            </>
          ) : (
            <>
              <Button
                className="h-8"
                type="button"
                disabled={isSubmitting}
                onClick={onApprove}
              >
                <Check className="size-4" />
                {t("crm.customers.actions.approve")}
              </Button>
              <Button
                className="h-8"
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={onRequestChanges}
              >
                <RotateCcw className="size-4" />
                {t("crm.customers.actions.request_changes")}
              </Button>
              <Button
                className="h-8"
                type="button"
                variant="destructive"
                disabled={isSubmitting}
                onClick={onReject}
              >
                <X className="size-4" />
                {t("crm.customers.actions.reject")}
              </Button>
            </>
          )
        ) : null}

        {!isReadonly && !showCheckerActions ? (
          showMakerActions ? (
            <>
              <Button
                className="h-8"
                type="button"
                disabled={isSubmitting || (canSubmit != null && !canSubmit)}
                onClick={onSaveAndRevise ?? onSaveAndComplete}
              >
                <Send className="size-4" />
                {t("crm.customers.actions.complete")}
              </Button>
              <Button
                className="h-8"
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={onSaveDraft}
              >
                <Save className="size-4" />
                {t("crm.customers.actions.save_draft")}
              </Button>
              {canCancelDraft && onCancelDraft ? (
                <Button
                  className="h-8"
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={onCancelDraft}
                >
                  <X className="size-4" />
                  {t("crm.customers.actions.cancel_draft")}
                </Button>
              ) : null}
            </>
          ) : onSaveAndSubmit ? (
            <Button
              className="h-8"
              type="button"
              disabled={isSubmitting}
              onClick={onSaveAndSubmit}
            >
              <Send className="size-4" />
              {t("crm.customers.actions.create")}
            </Button>
          ) : null
        ) : null}

        {canCancelDraft && onCancel ? (
          <Button
            className="h-8"
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            <X className="size-4" />
            {t("crm.customers.actions.cancel_profile")}
          </Button>
        ) : null}

        <Button
          className="h-8"
          type="button"
          variant="outline"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
          {t("common.action.back")}
        </Button>
      </div>
    </div>
  )
}
