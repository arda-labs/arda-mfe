import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, Check, MessageSquareWarning, X } from "lucide-react"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Page } from "@workspace/ui/components/page"
import { PageHeader } from "@workspace/ui/components/page-header"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  workflowTaskApi,
  type ReviewWorkItem,
} from "../../api"
import { ReviewLines, type ReviewLine } from "./components/review-lines"

interface PostingRequestVars {
  accountingDate?: string
  currencyCode?: string
  description?: string
  lines?: ReviewLine[]
}

interface CancellationVars {
  referenceEntryNo?: string
  reason?: string
  accountingDate?: string
}

type Decision = "APPROVE" | "REQUEST_CHANGES" | "REJECT"

const MAKER_STEP = "UT_MakerInput"

/**
 * Màn duyệt bút toán FAC: workbench deep-link (workItemId) → claim nếu cần →
 * đọc case variables → hiển thị thông tin + dòng bút toán read-only. Maker
 * "Xác nhận gửi"; checker "Phê duyệt / Yêu cầu bổ sung / Từ chối" (kèm lý do
 * bắt buộc khi không phê duyệt). Thay dialog duyệt chung cho 5 luồng FIN.
 */
export function PostingReviewPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const workItemId = searchParams.get("workItemId") ?? ""
  const returnUrl =
    searchParams.get("returnUrl") ?? "/workbench/incoming-transactions"

  const [item, setItem] = useState<ReviewWorkItem | null>(null)
  const [variables, setVariables] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [comment, setComment] = useState("")
  const [commentError, setCommentError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const claimedRef = useRef(false)

  const load = useCallback(async () => {
    if (!workItemId) {
      setError(true)
      return
    }
    setLoading(true)
    setError(false)
    try {
      let workItem = await workflowTaskApi.getWorkItem(workItemId)
      if (workItem.canClaim && workItem.jobKey && !claimedRef.current) {
        claimedRef.current = true
        const claimed = await workflowTaskApi.claimWorkItem(workItemId)
        workItem = claimed.workItem ?? workItem
      }
      setItem(workItem)
      const caseVars = await workflowTaskApi.getCaseVariables(workItem.caseId)
      setVariables(caseVars.variables ?? {})
    } catch (reason) {
      setItem(null)
      setError(true)
      notify.error(
        translateApiError(reason, t("finance.posting_review.load_failed"))
      )
    } finally {
      setLoading(false)
    }
  }, [workItemId, t])

  useEffect(() => {
    void load()
  }, [load])

  const flow = typeof variables.flow === "string" ? variables.flow : ""
  const postingRequest = variables.postingRequest as
    | PostingRequestVars
    | undefined
  const cancellation = variables.cancellationRequest as
    | CancellationVars
    | undefined
  const lines = postingRequest?.lines ?? []
  const currency = postingRequest?.currencyCode || "VND"
  const isMakerStep = item?.stepCode === MAKER_STEP

  async function decide(decision: Decision) {
    if (!item?.jobKey || !item.processInstanceKey) return
    const trimmed = comment.trim()
    if (decision !== "APPROVE" && !trimmed) {
      setCommentError(true)
      return
    }
    setSubmitting(true)
    try {
      await workflowTaskApi.completeTask({
        jobKey: item.jobKey,
        processInstanceKey: item.processInstanceKey,
        elementId: item.stepCode,
        variables: {
          decision,
          reviewDecision: decision,
          comment: trimmed,
          reviewComment: trimmed,
        },
      })
      notify.success(t("finance.posting_review.submit_success"))
      navigate(returnUrl)
    } catch (reason) {
      notify.error(
        translateApiError(reason, t("finance.posting_review.submit_failed"))
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Page variant="fixed">
        <PageHeader title={t("finance.posting_review.title")} />
        <div className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">
          {t("finance.posting_review.loading")}
        </div>
      </Page>
    )
  }

  if (error || !item) {
    return (
      <Page variant="fixed">
        <PageHeader title={t("finance.posting_review.title")} />
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {t(
            workItemId
              ? "finance.posting_review.load_failed"
              : "finance.posting_review.missing_work_item"
          )}
        </div>
        <div className="pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(returnUrl)}
          >
            <ArrowLeft className="size-4" />
            {t("finance.posting_review.back")}
          </Button>
        </div>
      </Page>
    )
  }

  return (
    <Page variant="fixed">
      <PageHeader
        title={t("finance.posting_review.title")}
        description={item.title}
        meta={
          <>
            <Badge variant="outline" className="shrink-0">
              {item.caseCode}
            </Badge>
            <Badge variant="secondary" className="shrink-0">
              {flow ? t(`finance.posting_review.flow.${flow}`) : item.caseType}
            </Badge>
            {item.stepName ? (
              <Badge variant="secondary" className="shrink-0">
                {item.stepName}
              </Badge>
            ) : null}
          </>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto [scrollbar-gutter:stable]">
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

        {!isMakerStep ? (
          <div className="max-w-xl space-y-1.5">
            <Label htmlFor="review-comment">
              {t("finance.posting_review.comment_label")}
            </Label>
            <Textarea
              id="review-comment"
              rows={3}
              value={comment}
              disabled={submitting}
              placeholder={t("finance.posting_review.comment_placeholder")}
              onChange={(event) => {
                setComment(event.target.value)
                setCommentError(false)
              }}
            />
            {commentError ? (
              <p className="text-sm text-destructive">
                {t("finance.posting_review.comment_required")}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {isMakerStep ? (
            <Button
              type="button"
              disabled={submitting}
              onClick={() => void decide("APPROVE")}
            >
              <Check className="size-4" />
              {t("finance.posting_review.action.confirm")}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void decide("APPROVE")}
              >
                <Check className="size-4" />
                {t("finance.posting_review.action.approve")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => void decide("REQUEST_CHANGES")}
              >
                <MessageSquareWarning className="size-4" />
                {t("finance.posting_review.action.request_changes")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={submitting}
                onClick={() => void decide("REJECT")}
              >
                <X className="size-4" />
                {t("finance.posting_review.action.reject")}
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(returnUrl)}
          >
            <ArrowLeft className="size-4" />
            {t("finance.posting_review.back")}
          </Button>
        </div>
      </div>
    </Page>
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
