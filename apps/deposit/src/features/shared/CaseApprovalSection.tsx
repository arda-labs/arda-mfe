import { useI18n } from "@workspace/i18n"
import { CaseApprovalTrail } from "@workspace/case-tabs/case-approval-trail"

/**
 * "Luồng phê duyệt" block for a detail page's side column: the maker →
 * checker → final trail of the workflow case a deposit record is linked to.
 */
export function CaseApprovalSection({ caseId }: { caseId: string }) {
  const { t } = useI18n()
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {t("common.approval.label")}
      </h2>
      <CaseApprovalTrail caseId={caseId} />
    </section>
  )
}
