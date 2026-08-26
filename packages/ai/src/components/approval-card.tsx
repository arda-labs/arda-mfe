import { useState, useEffect } from "react"
import { useI18n } from "@workspace/i18n"
import { api, ApiClientError } from "@workspace/api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { ShieldCheck, Clock, AlertCircle } from "lucide-react"
import {
  executeApprovedProposal,
} from "../conversations"
import { textValue, type ApprovalProposalView } from "../messages"

type ApprovalDecisionResponse = {
  id: string
  status: string
}

export function ApprovalCard({
  proposal,
  resume = true,
}: {
  proposal: ApprovalProposalView
  resume?: boolean
}) {
  const { t, formatDate } = useI18n()
  const [status, setStatus] = useState(proposal.status)
  const [pending, setPending] = useState<"approve" | "reject" | null>(null)
  const [executing, setExecuting] = useState(false)
  const [executedSummary, setExecutedSummary] = useState("")
  const [error, setError] = useState("")
  const [isExpired, setIsExpired] = useState(() => {
    if (!proposal.expiresAt) return false
    return new Date(proposal.expiresAt).getTime() <= Date.now()
  })
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(() => {
    if (!proposal.expiresAt) return null
    return Math.max(0, Math.floor((new Date(proposal.expiresAt).getTime() - Date.now()) / 1000))
  })

  useEffect(() => {
    if (!proposal.expiresAt || status !== "PENDING") return

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(proposal.expiresAt!).getTime() - Date.now()) / 1000))
      setRemainingSeconds(remaining)
      if (remaining <= 0) {
        setIsExpired(true)
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [proposal.expiresAt, status])

  async function decide(decision: "approve" | "reject") {
    if (isExpired) return
    setPending(decision)
    setError("")
    try {
      const record = await api.post<ApprovalDecisionResponse>(
        `/api/ai/approvals/${encodeURIComponent(proposal.id)}/decision`,
        { decision }
      )
      const nextStatus = textValue(
        record.status,
        decision === "approve" ? "APPROVED" : "REJECTED"
      )
      setStatus(nextStatus)
      if (nextStatus === "APPROVED" && resume) {
        setExecuting(true)
        try {
          const executed = await executeApprovedProposal(proposal.id)
          setStatus("EXECUTED")
          setExecutedSummary(executed.summary)
        } finally {
          setExecuting(false)
        }
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
      aria-labelledby={`approval-title-${proposal.id}`}
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
        <h4 id={`approval-title-${proposal.id}`} className="text-sm font-semibold text-foreground">
          {t("ai.approval.title") || "Yêu cầu phê duyệt hành động"}
        </h4>
        <Badge variant={isExpired ? "outline" : "secondary"} className="ml-auto shrink-0 text-xs">
          {isExpired ? (t("ai.approval.expired") || "Đã hết hạn") : (t("ai.approval.badge") || "Cần phê duyệt")}
        </Badge>
      </div>

      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
        {t("ai.approval.description") || "Trợ lý AI đề xuất một thao tác có ảnh hưởng đến dữ liệu. Vui lòng xác nhận trước khi hệ thống thực thi."}
      </p>

      {proposal.expiresAt && !decided && (
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
                time: formatDate(proposal.expiresAt, {
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
          disabled={decided || isExpired || pending !== null || executing}
          onClick={() => void decide("approve")}
          className="h-7.5 px-3 text-xs"
          aria-label={t("ai.approval.approve_aria") || "Xác nhận phê duyệt thao tác"}
        >
          {pending === "approve" || executing
            ? (t("ai.approval.saving") || "Đang xử lý...")
            : (t("ai.approval.approve") || "Phê duyệt")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={decided || isExpired || pending !== null || executing}
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

      {executing && (
        <p className="mt-2 text-xs text-muted-foreground motion-safe:animate-pulse">
          {t("ai.approval.executing") || "Đang thực thi thao tác đã phê duyệt..."}
        </p>
      )}

      {executedSummary && (
        <div className="mt-2.5 rounded-lg bg-background border p-2.5 text-xs leading-5 font-mono text-muted-foreground">
          {executedSummary}
        </div>
      )}
    </section>
  )
}
