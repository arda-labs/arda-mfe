import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import type { ApprovalDetail } from "../types"

interface ProposalDetailDialogProps {
  proposal: ApprovalDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
}

export function ProposalDetailDialog({
  proposal,
  open,
  onOpenChange,
  onApprove,
  onReject,
}: ProposalDetailDialogProps) {
  const { t, formatDate } = useI18n()

  if (!proposal) return null

  const isPending = proposal.status === "PENDING"
  const isExpired = new Date(proposal.expiresAt).getTime() < Date.now()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="font-mono text-base font-semibold">
              {proposal.toolName}
            </DialogTitle>
            <Badge
              variant={
                proposal.risk === "high"
                  ? "destructive"
                  : proposal.risk === "medium"
                    ? "warning"
                    : "secondary"
              }
            >
              {t(`ai.approvals.risk.${proposal.risk}`)}
            </Badge>
          </div>
          <DialogDescription>
            {t("ai.approvals.detail.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border bg-muted/40 p-2.5">
              <span className="text-xs text-muted-foreground">
                {t("ai.approvals.field.status")}
              </span>
              <p className="mt-1 font-medium">
                {isExpired && isPending
                  ? t("ai.approvals.status.expired")
                  : t(`ai.approvals.status.${proposal.status.toLowerCase()}`)}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-2.5">
              <span className="text-xs text-muted-foreground">
                {t("ai.approvals.field.expires_at")}
              </span>
              <p className="mt-1 font-mono text-xs font-medium">
                {formatDate(proposal.expiresAt, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-2.5">
              <span className="text-xs text-muted-foreground">
                {t("ai.approvals.field.thread_id")}
              </span>
              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                {proposal.threadId}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-2.5">
              <span className="text-xs text-muted-foreground">
                {t("ai.approvals.field.created_at")}
              </span>
              <p className="mt-1 font-mono text-xs font-medium">
                {formatDate(proposal.createdAt, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-muted-foreground">
              {t("ai.approvals.field.arguments")}
            </span>
            <pre className="mt-1.5 max-h-60 overflow-auto rounded-lg border bg-muted/70 p-3 font-mono text-xs">
              {JSON.stringify(proposal.arguments, null, 2)}
            </pre>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("ai.approvals.btn.close")}
          </Button>
          {isPending && !isExpired && onApprove && onReject && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => {
                  onReject(proposal.id)
                  onOpenChange(false)
                }}
              >
                {t("ai.approvals.btn.reject")}
              </Button>
              <Button
                onClick={() => {
                  onApprove(proposal.id)
                  onOpenChange(false)
                }}
              >
                {t("ai.approvals.btn.approve")}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
