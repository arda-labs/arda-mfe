import { useState, useEffect } from "react"
import { useI18n } from "@workspace/i18n"
import { api, ApiClientError } from "@workspace/api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { useAgUiSubmitInterruptResponses } from "@assistant-ui/react-ag-ui"
import { ShieldCheck, Clock, AlertCircle } from "lucide-react"
import { textValue, type ApprovalProposalView } from "../messages"

type ApprovalDecisionResponse = {
  id: string
  status: string
}

export function ApprovalCard({
  proposal: { id: proposalId, expiresAt, status: initialStatus },
  resume = true,
}: {
  proposal: ApprovalProposalView
  resume?: boolean
}) {
  const { t, formatDate } = useI18n()
  const submitInterruptResponses = useAgUiSubmitInterruptResponses()
  const [status, setStatus] = useState(initialStatus)
  const [pending, setPending] = useState<"approve" | "reject" | null>(null)
  const [error, setError] = useState("")
  const [isExpired, setIsExpired] = useState(() => {
    if (!expiresAt) return false
    return new Date(expiresAt).getTime() <= Date.now()
  })
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(() => {
    if (!expiresAt) return null
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  })

  useEffect(() => {
    if (!expiresAt || status !== "PENDING") return
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt!).getTime() - Date.now()) / 1000))
      setRemainingSeconds(remaining)
      if (remaining <= 0) {
        setIsExpired(true)
        clearInterval(interval)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, status])

  async function decide(decision: "approve" | "reject") {
    if (isExpired) return
    setPending(decision)
    setError("")
    try {
      const record = await api.post<ApprovalDecisionResponse>(
        `/api/ai/approvals/${encodeURIComponent(proposalId)}/decision`,
        { decision }
      )
      const nextStatus = textValue(
        record.status,
        decision === "approve" ? "APPROVED" : "REJECTED"
      )
      setStatus(nextStatus)

      // AG-UI: submit the interrupt response so the runtime resumes the
      // agent loop via HttpAgent (same /api/ai/agent endpoint). The BE
      // picks up the resume entry, executes the approved tool, and
      // continues streaming AG-UI events.
      if (nextStatus === "APPROVED" && resume) {
        await submitInterruptResponses([
          { interruptId: proposalId, status: "resolved" },
        ])
      }
    } catch (caught) {
      setError(
        caught instanceof ApiClientError && caught.message
          ? caught.message
          : (t("ai.approval.error") || "Không thể lưu quyết định phê duyệt")
      )
    } finally {
      setPending(null)
    }
  }

  const decided = status !== "PENDING"
  const isUrgent = remainingSeconds !== null && remainingSeconds < 120 && !isExpired && !decided

  return (
    <section
      aria-labelledby={`approval-title-${proposalId}`}
      className={`mt-3 rounded-xl border p-3.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200 ${
        isExpired
          ? "border-muted bg-muted/20 opacity-75"
          : isUrgent
            ? "border-amber-500/60 bg-amber-500/10"
            : "border-amber-500/40 bg-amber-500/5"
      }`}
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className={`size-4 shrink-0 ${isExpired ? "text-muted-foreground" : "text-amber-600"}`} />
        <h4 id={`approval-title-${proposalId}`} className="text-sm font-semibold text-foreground">
          {t("ai.approval.title") || "Yêu cầu phê duyệt hành động"}
        </h4>
        <Badge variant={isExpired ? "outline" : "secondary"} className="ml-auto shrink-0 text-xs">
          {isExpired ? (t("ai.approval.expired") || "Đã hết hạn") : (t("ai.approval.badge") || "Cần phê duyệt")}
        </Badge>
      </div>

      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
        {t("ai.approval.description") || "Trợ lý AI đề xuất một thao tác có ảnh hưởng đến dữ liệu. Vui lòng xác nhận trước khi hệ thống thực thi."}
      </p>

      {expiresAt && !decided && (
        <div className={`mt-2 flex items-center gap-1.5 text-xs ${isUrgent ? "text-destructive font-medium" : "text-muted-foreground"}`}>
          <Clock className="size-3.5" />
          {isExpired ? (
            <span>{t("ai.approval.expired_notice") || "Yêu cầu đã hết hạn và không thể thực thi."}</span>
          ) : remainingSeconds !== null ? (
            <span>
              {t("ai.approval.expires_in", { minutes: Math.max(1, Math.ceil(remainingSeconds / 60)) }) ||
                `Hết hạn sau ${Math.max(1, Math.ceil(remainingSeconds / 60))} phút`}
            </span>
          ) : (
            <span>
              {t("ai.approval.expires", {
                time: formatDate(expiresAt, {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                }),
              })}
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive" role="alert">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={decided || isExpired || pending !== null}
          onClick={() => void decide("approve")}
          className="h-7.5 px-3 text-xs"
          aria-label={t("ai.approval.approve_aria") || "Xác nhận phê duyệt thao tác"}
        >
          {pending === "approve"
            ? (t("ai.approval.saving") || "Đang xử lý...")
            : (t("ai.approval.approve") || "Phê duyệt")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={decided || isExpired || pending !== null}
          onClick={() => void decide("reject")}
          className="h-7.5 px-3 text-xs"
        >
          {pending === "reject"
            ? (t("ai.approval.saving") || "Đang xử lý...")
            : (t("ai.approval.reject") || "Từ chối")}
        </Button>
        {decided && (
          <Badge variant="outline" className="text-xs">
            {status === "APPROVED"
              ? (t("ai.approval.approved") || "Đã phê duyệt")
              : status === "REJECTED"
                ? (t("ai.approval.rejected") || "Đã từ chối")
                : status === "EXECUTED"
                  ? (t("ai.approval.executed") || "Đã thực thi")
                  : status}
          </Badge>
        )}
      </div>
    </section>
  )
}