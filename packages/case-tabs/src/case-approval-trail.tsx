import { useI18n } from "@workspace/i18n"
import { ApprovalTrail } from "@workspace/ui/components/approval-trail"
import { deriveApprovalTrail } from "./approval-trail"
import { useCaseTimeline } from "./use-case-timeline"

/**
 * Maker → checker → final step of a business case, from its workflow
 * timeline. `finalLabel` names the last step for the domain ("Hạch toán"
 * for postings); it defaults to "Hoàn tất".
 */
export function CaseApprovalTrail({
  caseId,
  finalLabel,
}: {
  caseId: string
  finalLabel?: string
}) {
  const { t } = useI18n()
  const { events, loading, failed } = useCaseTimeline(caseId)

  if (loading && events.length === 0) {
    return <p className="text-xs text-muted-foreground">{t("case_tabs.activity.loading")}</p>
  }
  if (failed) {
    return <p className="text-xs text-destructive">{t("case_tabs.activity.load_error")}</p>
  }

  const labels = {
    maker: t("common.approval.step.maker"),
    checker: t("common.approval.step.checker"),
    final: finalLabel ?? t("common.approval.step.final"),
  }
  return (
    <ApprovalTrail
      label={t("common.approval.label")}
      steps={deriveApprovalTrail(events).map((step) => ({ ...step, label: labels[step.id] }))}
    />
  )
}
