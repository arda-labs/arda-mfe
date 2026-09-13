import { useI18n } from "@workspace/i18n"
import { ReviewLines, type ReviewLine } from "./review-lines"

export interface PostingRequestVars {
  accountingDate?: string
  currencyCode?: string
  description?: string
  lines?: ReviewLine[]
}

export interface CancellationVars {
  referenceEntryNo?: string
  reason?: string
  accountingDate?: string
}

/**
 * Tab nghiệp vụ "Thông tin bút toán" của màn duyệt FAC: thông tin chung của
 * yêu cầu hạch toán (hoặc yêu cầu hủy giao dịch) + dòng bút toán read-only.
 */
export function ReviewInfo({
  postingRequest,
  cancellation,
  lines,
  currency,
}: {
  postingRequest?: PostingRequestVars
  cancellation?: CancellationVars
  lines: ReviewLine[]
  currency: string
}) {
  const { t } = useI18n()

  return (
    <div className="space-y-4">
      <div className="grid gap-x-8 gap-y-2 rounded-md border p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <InfoField
          label={t("finance.posting_review.info.accounting_date")}
          value={
            postingRequest?.accountingDate ||
            cancellation?.accountingDate ||
            "—"
          }
        />
        <InfoField
          label={t("finance.posting_review.info.currency")}
          value={currency}
        />
        {cancellation ? (
          <>
            <InfoField
              label={t("finance.posting_review.info.reference")}
              value={cancellation.referenceEntryNo || "—"}
            />
            <InfoField
              label={t("finance.posting_review.info.reason")}
              value={cancellation.reason || "—"}
            />
          </>
        ) : (
          <InfoField
            label={t("finance.posting_review.info.description")}
            value={postingRequest?.description || "—"}
          />
        )}
      </div>

      <ReviewLines lines={lines} currency={currency} />
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
