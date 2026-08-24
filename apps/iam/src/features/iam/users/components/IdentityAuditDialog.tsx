import { useI18n } from "@workspace/i18n"
import type { IdentityConsistencyIssue } from "@/features/iam"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

export function IdentityAuditDialog({
  open,
  onOpenChange,
  identityIssues,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  identityIssues: IdentityConsistencyIssue[] | null
}) {
  const { t } = useI18n()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("admin.users.identity.audit_title")}</DialogTitle>
        </DialogHeader>
        {identityIssues?.length === 0 ? (
          <div className="rounded-lg border border-success/20 bg-success/10 p-3 text-sm text-success">
            {t("admin.users.identity.audit_empty")}
          </div>
        ) : (
          <div className="max-h-96 space-y-2 overflow-auto">
            {(identityIssues ?? []).map((issue, index) => (
              <div
                key={`${issue.type}-${issue.userId || issue.kratosIdentityId || index}`}
                className="rounded-lg border p-3 text-sm"
              >
                <div className="font-medium">{issue.type}</div>
                <div className="text-xs text-muted-foreground">
                  {[
                    issue.username,
                    issue.email,
                    issue.userId,
                    issue.kratosIdentityId,
                    issue.mappingIdentityId,
                  ]
                    .filter(Boolean)
                    .join(" · ") || `count: ${issue.count ?? 0}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
