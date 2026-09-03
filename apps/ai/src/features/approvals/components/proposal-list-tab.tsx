import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { CheckCircle2, Clock, Eye, XCircle } from "lucide-react"
import type { ApprovalDetail } from "../types"

interface ProposalListTabProps {
  proposals: ApprovalDetail[]
  loading: boolean
  onSelect: (proposal: ApprovalDetail) => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  isHistory?: boolean
}

export function ProposalListTab({
  proposals,
  loading,
  onSelect,
  onApprove,
  onReject,
  isHistory = false,
}: ProposalListTabProps) {
  const { t, formatDate } = useI18n()

  if (loading && proposals.length === 0) {
    return (
      <div className="space-y-3 py-6">
        <div className="h-20 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-20 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-20 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <Clock className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium">
          {isHistory
            ? t("ai.approvals.empty_history")
            : t("ai.approvals.empty_pending")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {isHistory
            ? t("ai.approvals.empty_history_tip")
            : t("ai.approvals.empty_pending_tip")}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {proposals.map((p) => {
        const isPending = p.status === "PENDING"
        const isExpired = new Date(p.expiresAt).getTime() < Date.now()

        return (
          <div
            key={p.id}
            className="flex flex-col justify-between gap-4 rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-xs sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold tracking-tight">
                  {p.toolName}
                </span>
                <Badge
                  variant={
                    p.risk === "high"
                      ? "destructive"
                      : p.risk === "medium"
                        ? "warning"
                        : "secondary"
                  }
                  className="text-[10px]"
                >
                  {t(`ai.approvals.risk.${p.risk}`)}
                </Badge>
                <Badge
                  variant={
                    p.status === "APPROVED"
                      ? "default"
                      : p.status === "REJECTED"
                        ? "destructive"
                        : isExpired
                          ? "outline"
                          : "secondary"
                  }
                  className="text-[10px]"
                >
                  {isExpired && isPending
                    ? t("ai.approvals.status.expired")
                    : t(`ai.approvals.status.${p.status.toLowerCase()}`)}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {t("ai.approvals.field.created_at")}:{" "}
                  {formatDate(p.createdAt, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
                <span>
                  {t("ai.approvals.field.expires_at")}:{" "}
                  {formatDate(p.expiresAt, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
                <span className="truncate font-mono">
                  Thread: {p.threadId}
                </span>
              </div>

              <div className="max-w-xl truncate font-mono text-xs text-muted-foreground/80">
                {JSON.stringify(p.arguments)}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => onSelect(p)}
              >
                <Eye className="h-3.5 w-3.5" />
                {t("ai.approvals.btn.view")}
              </Button>

              {isPending && !isExpired && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-destructive hover:bg-destructive/10"
                    onClick={() => onReject(p.id)}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {t("ai.approvals.btn.reject")}
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={() => onApprove(p.id)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("ai.approvals.btn.approve")}
                  </Button>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
