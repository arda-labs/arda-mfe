import { useQuery } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import { useCaseTabs } from "@workspace/case-tabs"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Page } from "@workspace/ui/components/page"
import { PageHeader } from "@workspace/ui/components/page-header"
import { Skeleton } from "@workspace/ui/components/skeleton"
import type { WorkflowCase } from "../api"
import { workbenchApi } from "../api"
import { navigateTo } from "../utils/nav"
import { pickCaseViewItem, type CaseViewRequest } from "../utils/case-view"
import { CaseReviewLayout } from "./case-review-layout"
import { CaseTabsPanel } from "./case-tabs-panel"
import { useTaskForm } from "./use-task-form"

/** Read-only submit: the view never completes a task, whatever the form calls. */
const noopSubmit = () => undefined

/**
 * Read-only screen for one case, opened by `?caseCode=X&mode=view` from the
 * transaction search (or the outgoing list). Closed cases (COMPLETED /
 * REJECTED / CANCELLED) have no open task, so the incoming/outgoing lists
 * can never show them; this screen resolves the case by code instead.
 *
 * Nothing here can write: the form gets `mode="view"`, a no-op `onSubmit` and
 * no `onReject`, and uploads are off.
 */
export function CaseViewPage({ request }: { request: CaseViewRequest }) {
  const { t } = useI18n()
  const { caseCode, returnUrl } = request

  const itemsQuery = useQuery({
    queryKey: ["workflow", "case-view", "work-items", caseCode],
    queryFn: async () =>
      pickCaseViewItem(
        await workbenchApi.listWorkItems({
          keyword: caseCode,
          direction: "ALL",
          limit: 20,
        }),
        caseCode
      ) ?? null,
  })
  const caseQuery = useQuery({
    queryKey: ["workflow", "case-view", "case", caseCode],
    queryFn: async () => (await workbenchApi.findCaseByCode(caseCode)) ?? null,
  })

  const item = itemsQuery.data ?? undefined
  const caseRecord = caseQuery.data ?? undefined
  const caseId = item?.caseId ?? caseRecord?.id
  const taskForm = useTaskForm(item, { tolerateMissingData: true })
  const caseTabs = useCaseTabs({ caseId, canUpload: false })

  const goBack = () => navigateTo(returnUrl)
  const loading = itemsQuery.isPending || caseQuery.isPending
  const notFound = !loading && !item && !caseRecord
  const failed =
    !loading && !item && !caseRecord && (itemsQuery.isError || caseQuery.isError)
  const Form = taskForm.form

  return (
    <Page>
      <PageHeader
        title={caseCode}
        description={item?.title ?? caseRecord?.title}
        meta={
          caseRecord ? (
            <Badge variant="outline">{statusLabel(t, caseRecord.status)}</Badge>
          ) : null
        }
        actions={
          <Button type="button" variant="secondary" onClick={goBack}>
            <ArrowLeft className="size-4" />
            {t("common.action.back")}
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3" aria-label={t("workflow.workbench.case_view.loading")}>
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : null}

      {notFound ? (
        <p
          className={
            failed
              ? "rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
              : "rounded-md border border-warning/40 bg-warning/5 px-4 py-3 text-sm"
          }
        >
          {t(
            failed
              ? "workflow.workbench.case_view.load_error"
              : "workflow.workbench.case_view.not_found",
            { code: caseCode }
          )}
        </p>
      ) : null}

      {!loading && !notFound ? (
        <CaseReviewLayout caseId={caseId}>
          {item && taskForm.state === "loading" && taskForm.hasRemote ? (
            <Skeleton className="h-40 w-full" />
          ) : null}
          {item && taskForm.state === "ready" && Form ? (
            <Form
              task={item}
              mode="view"
              data={taskForm.data}
              onSubmit={noopSubmit}
              onReturn={goBack}
            />
          ) : null}
          {taskForm.state === "error" && taskForm.hasRemote ? (
            <div className="space-y-2">
              <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {t("workflow.workbench.task_form.load_error")}
              </p>
              <Button type="button" variant="outline" onClick={taskForm.retry}>
                {t("workflow.workbench.task_form.retry")}
              </Button>
            </div>
          ) : null}
          {showSummary(item, taskForm) && caseRecord ? (
            <CaseSummary record={caseRecord} />
          ) : null}
          <CaseTabsPanel tabs={caseTabs} />
        </CaseReviewLayout>
      ) : null}
    </Page>
  )
}

/** The summary card stands in whenever the step form is not on screen. */
function showSummary(
  item: unknown,
  taskForm: { state: string; hasRemote: boolean }
) {
  if (!item || !taskForm.hasRemote) return true
  return taskForm.state === "unsupported" || taskForm.state === "error"
}

function CaseSummary({ record }: { record: WorkflowCase }) {
  const { t, formatDate } = useI18n()
  const when = (value: string | null | undefined) =>
    value ? formatDate(value, { dateStyle: "short", timeStyle: "short" }) : "—"
  const rows: Array<[string, string]> = [
    ["case_type", record.caseType],
    ["status", statusLabel(t, record.status)],
    ["current_step", record.currentStep || "—"],
    ["created_by", record.createdBy || "—"],
    ["created_at", when(record.createdAt)],
    ["completed_at", when(record.completedAt)],
  ]
  return (
    <section className="space-y-3 rounded-md border p-4">
      <h3 className="text-sm font-semibold">
        {t("workflow.workbench.case_view.summary")}
      </h3>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([key, value]) => (
          <div key={key} className="min-w-0">
            <dt className="text-xs text-muted-foreground">
              {t(`workflow.workbench.case_view.field.${key}`)}
            </dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

type TFn = ReturnType<typeof useI18n>["t"]

/** Known case statuses get a label; anything else shows the raw code. */
function statusLabel(t: TFn, status: string) {
  const key = `workflow.workbench.case_view.status.${status}`
  const translated = t(key)
  return translated === key ? status : translated
}
