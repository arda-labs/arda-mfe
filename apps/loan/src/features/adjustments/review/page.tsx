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
  formationApi,
  loanAdjustmentKinds,
  loanApi,
  type FormationWorkItem,
  type LoanAdjustment,
  type LoanAdjustmentKind,
} from "../../api"
import { AdjustmentDetail } from "./components/adjustment-detail"

type Decision = "APPROVE" | "REQUEST_CHANGES" | "REJECT"

const MAKER_STEP = "UT_MakerInput"

/**
 * Màn duyệt điều chỉnh khoản vay: workbench deep-link (workItemId) → claim →
 * đọc case variables (kind + adjustmentId) → tải bản ghi điều chỉnh → hiển
 * thị read-only (header + payload per kind). Maker "Xác nhận gửi"; checker
 * "Phê duyệt / Yêu cầu bổ sung / Từ chối" (bắt buộc lý do khi không phê duyệt).
 */
export function AdjustmentReviewPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const workItemId = searchParams.get("workItemId") ?? ""
  const returnUrl =
    searchParams.get("returnUrl") ?? "/workbench/incoming-transactions"

  const [item, setItem] = useState<FormationWorkItem | null>(null)
  const [kind, setKind] = useState<LoanAdjustmentKind | null>(null)
  const [adjustment, setAdjustment] = useState<LoanAdjustment | null>(null)
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
      let workItem = await formationApi.getWorkItem(workItemId)
      if (workItem.canClaim && workItem.jobKey && !claimedRef.current) {
        claimedRef.current = true
        const claimed = await formationApi.claimWorkItem(workItemId)
        workItem = claimed.workItem ?? workItem
      }
      setItem(workItem)

      const caseVars = workItem.caseId
        ? await formationApi.getCaseVariables(workItem.caseId)
        : null
      const vars = (caseVars?.variables ?? {}) as Record<string, unknown>
      const rawKind = typeof vars.kind === "string" ? vars.kind : ""
      const adjustmentId =
        typeof vars.adjustmentId === "string" && vars.adjustmentId
          ? vars.adjustmentId
          : (workItem.primaryObjectId ?? "")
      const resolvedKind = loanAdjustmentKinds.some((k) => k.key === rawKind)
        ? (rawKind as LoanAdjustmentKind)
        : null
      if (!resolvedKind || !adjustmentId) {
        setError(true)
        return
      }
      setKind(resolvedKind)
      setAdjustment(await loanApi.getAdjustment(resolvedKind, adjustmentId))
    } catch (reason) {
      setItem(null)
      setAdjustment(null)
      setError(true)
      notify.error(
        translateApiError(reason, t("loan.adjustment_review.load_failed"))
      )
    } finally {
      setLoading(false)
    }
  }, [workItemId, t])

  useEffect(() => {
    void load()
  }, [load])

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
      await formationApi.completeTask({
        jobKey: String(item.jobKey),
        processInstanceKey: String(item.processInstanceKey),
        elementId: item.stepCode ?? "",
        variables: {
          decision,
          reviewDecision: decision,
          comment: trimmed,
          reviewComment: trimmed,
        },
      })
      notify.success(t("loan.adjustment_review.submit_success"))
      navigate(returnUrl)
    } catch (reason) {
      notify.error(
        translateApiError(reason, t("loan.adjustment_review.submit_failed"))
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Page variant="fixed">
        <PageHeader title={t("loan.adjustment_review.title")} />
        <div className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">
          {t("loan.adjustment_review.loading")}
        </div>
      </Page>
    )
  }

  if (error || !item || !kind || !adjustment) {
    return (
      <Page variant="fixed">
        <PageHeader title={t("loan.adjustment_review.title")} />
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {t(
            workItemId
              ? "loan.adjustment_review.load_failed"
              : "loan.adjustment_review.missing_work_item"
          )}
        </div>
        <div className="pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(returnUrl)}
          >
            <ArrowLeft className="size-4" />
            {t("loan.adjustment_review.back")}
          </Button>
        </div>
      </Page>
    )
  }

  return (
    <Page variant="fixed">
      <PageHeader
        title={t("loan.adjustment_review.title")}
        description={item.title}
        meta={
          <>
            {item.caseCode ? (
              <Badge variant="outline" className="shrink-0">
                {item.caseCode}
              </Badge>
            ) : null}
            <Badge variant="secondary" className="shrink-0">
              {t(`loan.kind.${kind.replace(/-/g, "_")}`)}
            </Badge>
          </>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto [scrollbar-gutter:stable]">
        <AdjustmentDetail kind={kind} adjustment={adjustment} />

        {!isMakerStep ? (
          <div className="max-w-xl space-y-1.5">
            <Label htmlFor="adjustment-review-comment">
              {t("loan.adjustment_review.comment_label")}
            </Label>
            <Textarea
              id="adjustment-review-comment"
              rows={3}
              value={comment}
              disabled={submitting}
              placeholder={t("loan.adjustment_review.comment_placeholder")}
              onChange={(event) => {
                setComment(event.target.value)
                setCommentError(false)
              }}
            />
            {commentError ? (
              <p className="text-sm text-destructive">
                {t("loan.adjustment_review.comment_required")}
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
              {t("loan.adjustment_review.action.confirm")}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void decide("APPROVE")}
              >
                <Check className="size-4" />
                {t("loan.adjustment_review.action.approve")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => void decide("REQUEST_CHANGES")}
              >
                <MessageSquareWarning className="size-4" />
                {t("loan.adjustment_review.action.request_changes")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={submitting}
                onClick={() => void decide("REJECT")}
              >
                <X className="size-4" />
                {t("loan.adjustment_review.action.reject")}
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(returnUrl)}
          >
            <ArrowLeft className="size-4" />
            {t("loan.adjustment_review.back")}
          </Button>
        </div>
      </div>
    </Page>
  )
}
