import { ArrowLeft, Check, MessageSquareWarning, Send, X } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"

/**
 * Footer formation — mirror role-based `FooterActions` CRM (customer-ui.tsx):
 * maker (LNM_MAKER) → "Trình duyệt"; reviewer (TW/PGD/GD/Board) → "Phê duyệt"
 * + "Yêu cầu bổ sung"; GD/Board thêm "Từ chối" (TW/PGD chỉ trả về maker).
 * Luôn có "Quay lại" → returnUrl ?? /loans.
 */
export function FormationFooterActions({
  canComplete,
  isMaker,
  isSubmitting,
  canReject = true,
  onApprove,
  onReject,
  onRequestChanges,
  onSubmitMaker,
  onBack,
}: {
  canComplete: boolean
  isMaker: boolean
  isSubmitting: boolean
  canReject?: boolean
  onApprove?: () => void
  onReject?: () => void
  onRequestChanges?: () => void
  onSubmitMaker?: () => void
  onBack: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="flex h-13 shrink-0 items-center border-t bg-background px-4">
      <div className="flex w-full flex-wrap justify-end gap-2">
        {canComplete && !isMaker ? (
          <>
            <Button
              className="h-8"
              type="button"
              disabled={isSubmitting}
              onClick={onApprove}
            >
              <Check className="size-4" />
              {t("loan.formation.action.approve")}
            </Button>
            <Button
              className="h-8"
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={onRequestChanges}
            >
              <MessageSquareWarning className="size-4" />
              {t("loan.formation.action.request_changes")}
            </Button>
            {canReject ? (
              <Button
                className="h-8"
                type="button"
                variant="destructive"
                disabled={isSubmitting}
                onClick={onReject}
              >
                <X className="size-4" />
                {t("loan.formation.action.reject")}
              </Button>
            ) : null}
          </>
        ) : null}
        {canComplete && isMaker ? (
          <Button
            className="h-8"
            type="button"
            disabled={isSubmitting}
            onClick={onSubmitMaker}
          >
            <Send className="size-4" />
            {t("loan.formation.action.submit_maker")}
          </Button>
        ) : null}
        <Button
          className="h-8"
          type="button"
          variant="outline"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
          {t("loan.formation.action.back")}
        </Button>
      </div>
    </div>
  )
}
