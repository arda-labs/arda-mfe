import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { api, ApiClientError } from "@workspace/api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { ShieldCheck } from "lucide-react"
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

  async function decide(decision: "approve" | "reject") {
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
          : t("ai.approval.error")
      )
    } finally {
      setPending(null)
    }
  }

  const decided = status !== "PENDING"

  return (
    <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 shrink-0 text-amber-600" />
        <p className="text-sm font-medium">{t("ai.approval.title")}</p>
        <Badge variant="secondary" className="ml-auto shrink-0">
          {t("ai.approval.badge")}
        </Badge>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
        {t("ai.approval.description")}
      </p>
      {proposal.expiresAt && (
        <p className="mt-1 text-xs text-muted-foreground">
          {t("ai.approval.expires", {
            time: formatDate(proposal.expiresAt, {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
            }),
          })}
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={decided || pending !== null || executing}
          onClick={() => void decide("approve")}
        >
          {pending === "approve" || executing
            ? t("ai.approval.saving")
            : t("ai.approval.approve")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={decided || pending !== null || executing}
          onClick={() => void decide("reject")}
        >
          {pending === "reject" ? t("ai.approval.saving") : t("ai.approval.reject")}
        </Button>
        {decided && (
          <Badge variant="outline">
            {status === "APPROVED"
              ? t("ai.approval.approved")
              : status === "REJECTED"
                ? t("ai.approval.rejected")
                : status === "EXECUTED"
                  ? t("ai.approval.executed")
                  : status}
          </Badge>
        )}
      </div>
      {executing && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("ai.approval.executing")}
        </p>
      )}
      {executedSummary && (
        <p className="mt-2 rounded-md bg-background p-2 text-xs leading-5">
          {executedSummary}
        </p>
      )}
    </div>
  )
}
