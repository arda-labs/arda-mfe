import type { ReactNode } from "react"
import { deriveApprovalTrail, useCaseTimeline } from "@workspace/case-tabs"
import { CaseApprovalTrail } from "@workspace/case-tabs/case-approval-trail"
import { useI18n } from "@workspace/i18n"
import { earlierChangeRequests } from "../utils/change-requests"

/**
 * Decision content beside the case's approval trail: a right column on wide
 * screens, a section above the inputs on narrow ones, so the reviewer sees
 * who submitted, when, and earlier change requests before deciding. Without
 * a case the children render alone.
 */
export function CaseReviewLayout({
  caseId,
  children,
}: {
  caseId: string | undefined
  children: ReactNode
}) {
  const { t } = useI18n()
  if (!caseId) return <>{children}</>
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <aside className="space-y-3 border-b pb-4 lg:order-last lg:border-b-0 lg:border-l lg:pb-0 lg:pl-4">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t("common.approval.label")}
        </h3>
        <CaseApprovalTrail caseId={caseId} />
        <ChangeRequestHistory caseId={caseId} />
      </aside>
      <div className="min-w-0 space-y-4">{children}</div>
    </div>
  )
}

/** Earlier change requests and their reasons, below the trail. */
function ChangeRequestHistory({ caseId }: { caseId: string }) {
  const { t, formatDate } = useI18n()
  const { events, failed } = useCaseTimeline(caseId)
  if (failed) return null

  const [maker] = deriveApprovalTrail(events)
  const requests = earlierChangeRequests(events, maker?.state === "returned")
  if (requests.length === 0) return null

  return (
    <section className="space-y-2 border-t pt-3">
      <h4 className="text-xs font-medium text-muted-foreground">
        {t("workflow.workbench.trail.earlier_requests", { count: requests.length })}
      </h4>
      <ol className="space-y-2">
        {requests.map((event) => (
          <li key={event.id} className="text-xs">
            <p className="text-muted-foreground">
              {[
                event.actor,
                formatDate(event.createdAt, { dateStyle: "short", timeStyle: "short" }),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <blockquote className="mt-1 rounded-md border-l-2 border-warning bg-muted/50 px-2.5 py-1.5 text-foreground">
              {event.note?.trim() || t("workflow.workbench.trail.no_reason")}
            </blockquote>
          </li>
        ))}
      </ol>
    </section>
  )
}
