import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useI18n, translateApiError } from "@workspace/i18n"
import { attachStagedCaseFiles } from "@workspace/case-tabs"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Page } from "@workspace/ui/components/page"
import { PageHeader } from "@workspace/ui/components/page-header"
import { notify } from "@workspace/ui/feedback/notify"
import { disbursementBatchApi } from "../../api"

const ATTACHMENT_IDS_KEY = "arda.loan.disbursement.attachments"
const ACTIVE_STATUSES = new Set(["PENDING_APPROVAL", "APPROVED"])

export function DisbursementTrackingPage() {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const { id = "" } = useParams()
  const [attachmentError, setAttachmentError] = useState(false)
  const query = useQuery({
    queryKey: ["loan", "disbursement-batch", id],
    queryFn: () => disbursementBatchApi.detail(id),
    enabled: Boolean(id),
    refetchInterval: (current) =>
      current.state.data && ACTIVE_STATUSES.has(current.state.data.status) ? 2_000 : false,
  })
  const batch = query.data
  const workflowCaseQuery = useQuery({
    queryKey: ["workflow", "case", batch?.workflow_case_id],
    queryFn: () => disbursementBatchApi.workflowCase(batch!.workflow_case_id!),
    enabled: Boolean(batch?.workflow_case_id),
  })

  useEffect(() => {
    const caseId = batch?.workflow_case_id
    if (!caseId || !id) return
    const key = `${ATTACHMENT_IDS_KEY}:${id}`
    const raw = sessionStorage.getItem(key)
    if (!raw) return
    let ids: string[]
    try {
      ids = JSON.parse(raw) as string[]
    } catch {
      setAttachmentError(true)
      return
    }
    void attachStagedCaseFiles(ids, caseId)
      .then(() => sessionStorage.removeItem(key))
      .catch(() => setAttachmentError(true))
  }, [batch?.workflow_case_id, id])

  const retry = async () => {
    if (!batch || !batch.data_version) return
    try {
      await disbursementBatchApi.submit(batch.id, batch.data_version)
      await query.refetch()
    } catch (error) {
      notify.error(translateApiError(error, "loan.disbursements.batch.submit_failed"))
    }
  }

  if (query.isPending) {
    return <Page variant="fixed"><p className="p-6 text-sm text-muted-foreground">{t("loan.loading")}</p></Page>
  }

  if (query.isError || !batch) {
    return (
      <Page variant="fixed">
        <PageHeader title={t("loan.disbursements.tracking.title")} />
        <div className="space-y-3 p-6" role="alert">
          <p className="text-sm text-destructive">{t("loan.disbursements.tracking.load_failed")}</p>
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>{t("common.action.retry")}</Button>
        </div>
      </Page>
    )
  }

  const statusKey = batch.status.toLowerCase()
  const received = batch.status !== "SUBMIT_FAILED"
  const workflowCase = workflowCaseQuery.data
  const approverLabel = workflowCaseQuery.isError
    ? t("loan.disbursements.tracking.approver_unavailable")
    : workflowCase?.candidateRole === "LNM_CHECKER"
    ? t("loan.disbursements.tracking.approver_loan_checker")
    : workflowCase?.candidateRole
      ? t("loan.disbursements.tracking.approver_workflow")
      : t("loan.disbursements.tracking.approver_pending")
  const deadline = workflowCase?.slaDueAt
    ? new Intl.DateTimeFormat(locale || undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(workflowCase.slaDueAt))
    : t("loan.disbursements.tracking.deadline_unavailable")
  return (
    <Page variant="fixed">
      <PageHeader
        title={t("loan.disbursements.tracking.title")}
        description={t("loan.disbursements.tracking.description")}
        actions={<Badge variant={batch.status === "SUBMIT_FAILED" ? "destructive" : "secondary"}>{t(`loan.disbursements.tracking.status.${statusKey}`)}</Badge>}
      />
      <div className="grid gap-4 p-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{t("loan.disbursements.tracking.reference")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="font-mono text-lg font-semibold">{batch.workflow_case_code || batch.id}</p>
            <p className="text-sm text-muted-foreground">{received ? t("loan.disbursements.tracking.next_step") : t("loan.disbursements.tracking.failed_detail")}</p>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">{t("loan.disbursements.tracking.expected_approver")}</dt>
                <dd>{approverLabel}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("loan.disbursements.tracking.processing_deadline")}</dt>
                <dd>{deadline}</dd>
              </div>
            </dl>
            {workflowCaseQuery.isError ? (
              <div className="flex items-center gap-2 text-sm" role="alert">
                <span className="text-destructive">{t("loan.disbursements.tracking.workflow_details_failed")}</span>
                <Button type="button" variant="link" size="sm" onClick={() => void workflowCaseQuery.refetch()}>{t("common.action.retry")}</Button>
              </div>
            ) : null}
            {batch.status === "DRAFT" ? <Button asChild><Link to={`/loans/disbursements/register?draftId=${encodeURIComponent(batch.id)}`}>{t("loan.disbursements.tracking.edit_draft")}</Link></Button> : null}
            {batch.status === "SUBMIT_FAILED" ? <Button type="button" onClick={() => void retry()} disabled={!batch.data_version}>{t("loan.disbursements.tracking.retry_submit")}</Button> : null}
            {batch.workflow_case_id ? <Button asChild variant="outline"><Link to={`/workbench/incoming-transactions?caseCode=${encodeURIComponent(batch.workflow_case_code || batch.workflow_case_id)}`}>{t("loan.disbursements.tracking.open_workbench")}</Link></Button> : null}
            {attachmentError ? <p className="text-sm text-destructive" role="alert">{t("loan.disbursements.tracking.attach_failed")}</p> : null}
            <Button type="button" variant="ghost" onClick={() => navigate("/loans/disbursements")}>{t("loan.disbursements.tracking.back_to_list")}</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("loan.disbursements.tracking.timeline")}</CardTitle></CardHeader>
          <CardContent>
            {batch.history?.length ? <ol className="space-y-3">
              {batch.history.map((event, index) => (
                <li key={`${event.created_at}-${index}`} className="border-l-2 pl-3 text-sm">
                  <p className="font-medium">{event.to_status || event.event_type}</p>
                  {event.detail ? <p className="text-muted-foreground">{event.detail}</p> : null}
                  <p className="text-xs text-muted-foreground">{event.created_at}</p>
                </li>
              ))}
            </ol> : <p className="text-sm text-muted-foreground">{t("loan.disbursements.tracking.no_history")}</p>}
          </CardContent>
        </Card>
      </div>
    </Page>
  )
}
