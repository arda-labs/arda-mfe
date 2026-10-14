import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useQueryClient } from "@tanstack/react-query"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { textSearchMeta } from "@workspace/list-page/column-filters"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { SavedViewTabs } from "@workspace/list-page/saved-view-tabs"
import { useRecordSheet } from "@workspace/list-page/use-record-sheet"
import { CheckCircle2, Eye } from "lucide-react"
import { formatDateTime } from "@workspace/format"
import { statisticalApi, type ReportSubmission } from "../api"
import { SUBMISSION_STATUSES, submissionsListDefinition } from "./list-query"
import { CreateSubmissionDialog } from "./components/CreateSubmissionDialog"
import { SubmissionDetailDialog } from "./components/SubmissionDetailDialog"
import { StatusBadge } from "@workspace/ui/components/status-badge"
import { SubmissionSheet } from "./submission-sheet"

/** Report submissions (QCMS): create DRAFT → submit case → approval. */
export function SubmissionsPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const statusLabels = useMemo<Record<string, string>>(
    () =>
      Object.fromEntries(
        SUBMISSION_STATUSES.map((status) => [
          status,
          t(`statistical.submissions.status.${status.toLowerCase()}`),
        ])
      ),
    [t]
  )
  // Refreshes the list and the view counts (they share the key prefix).
  const invalidateList = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: submissionsListDefinition.queryKey,
      }),
    [queryClient]
  )

  const submit = useCallback(
    async (item: ReportSubmission) => {
      try {
        await statisticalApi.submitSubmission(item.id)
        notify.success(t("statistical.submissions.submit_success"))
        await invalidateList()
      } catch (error) {
        notify.error(
          t("statistical.submissions.submit_failed"),
          translateApiError(error, t("statistical.action_failed"))
        )
      }
    },
    [invalidateList, t]
  )

  const columns = useMemo<ColumnDef<ReportSubmission>[]>(
    () => [
      {
        id: "report_code",
        accessorKey: "report_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("statistical.submissions.field.report")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("statistical.submissions.field.report"),
          t("statistical.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.report_code}</span>
        ),
      },
      {
        id: "period_code",
        accessorKey: "period_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("statistical.submissions.field.period")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("statistical.submissions.field.period"),
          "2026-09"
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.status")}
          />
        ),
        cell: ({ row }) => (
          <StatusBadge status={row.original.status}>
            {statusLabels[row.original.status] ?? row.original.status}
          </StatusBadge>
        ),
      },
      {
        id: "submitted_by",
        accessorKey: "submitted_by",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("statistical.submissions.field.submitted_by")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.submitted_by || "—"}</span>
        ),
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.created")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatDateTime(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right">{t("common.field.action")}</div>
        ),
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              title={t("common.action.view")}
              onClick={() => setDetailId(row.original.id)}
            >
              <Eye className="size-3.5" />
            </Button>
            {row.original.status === "DRAFT" ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => void submit(row.original)}
              >
                <CheckCircle2 className="size-3.5" />
                {t("statistical.submissions.submit")}
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [statusLabels, submit, t]
  )

  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
  } = useServerDataTable<ReportSubmission>({
    ...submissionsListDefinition,
    columns,
    queryFn: async (q) =>
      statisticalApi.listSubmissions({
        page: q.page,
        perPage: q.perPage,
        report_code: q.report_code === undefined ? undefined : String(q.report_code),
        period_code: q.period_code === undefined ? undefined : String(q.period_code),
        status: q.status === undefined ? undefined : String(q.status),
        sort: q.sort,
        order: q.order,
      }),
  })

  const sheet = useRecordSheet(table)
  // Work queues first (design board 12.2): the counts replace the old total badge.
  const views = useMemo(
    () => [
      { id: "all", label: t("statistical.submissions.view.all") },
      ...SUBMISSION_STATUSES.map((value) => ({
        id: value,
        value,
        label: statusLabels[value],
      })),
    ],
    [statusLabels, t]
  )

  return (
    <ListPageShell
      title={t("statistical.submissions.title")}
      totalRows={total}
      views={
        <SavedViewTabs
          views={views}
          urlKey="status"
          config={submissionsListDefinition.queryConfig}
          countKey={submissionsListDefinition.queryKey}
          countFn={(status) =>
            statisticalApi
              .listSubmissions({ status, page: 1, perPage: 1 })
              .then((res) => res.total)
          }
          aria-label={t("common.field.status")}
        />
      }
      onRowClick={sheet.openRow}
      activeRowId={sheet.activeRowId}
      criticalPending={isLoading}
      criticalError={loadError}
      onRetry={() => void refetch()}
      fetching={isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setCreateOpen(true)}
          createLabel={t("statistical.submissions.create")}
          exportFilename={t("statistical.submissions.title")}
          sheetName={t("statistical.submissions.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <>
          <CreateSubmissionDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSaved={() => void invalidateList()}
          />
          <SubmissionDetailDialog
            open={detailId !== null}
            onOpenChange={(open) => !open && setDetailId(null)}
            submissionId={detailId}
          />
          <SubmissionSheet
            record={sheet.record}
            sheet={sheet}
            statusLabels={statusLabels}
            onSubmit={(item) => void submit(item)}
            onOpenDetail={(item) => setDetailId(item.id)}
          />
        </>
      }
    />
  )
}
