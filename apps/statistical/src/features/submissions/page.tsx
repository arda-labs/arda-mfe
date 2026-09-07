import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useQueryClient } from "@tanstack/react-query"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import {
  multiSelectFilterMeta,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { CheckCircle2 } from "lucide-react"
import { statisticalApi, type ReportSubmission } from "../api"
import { SUBMISSION_STATUSES, submissionsListDefinition } from "./list-query"
import { CreateSubmissionDialog } from "./components/CreateSubmissionDialog"

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
}

/** Report submissions (QCMS): create DRAFT → submit case → approval. */
export function SubmissionsPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)

  const submit = useCallback(
    async (item: ReportSubmission) => {
      try {
        await statisticalApi.submitSubmission(item.id)
        notify.success(t("statistical.submissions.submit_success"))
        await queryClient.invalidateQueries({
          queryKey: submissionsListDefinition.queryKey,
        })
      } catch (error) {
        notify.error(
          t("statistical.submissions.submit_failed"),
          translateApiError(error, t("statistical.action_failed"))
        )
      }
    },
    [queryClient, t]
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
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(
          t("common.field.status"),
          SUBMISSION_STATUSES.map((status) => ({
            value: status,
            label: t(`statistical.submissions.status.${status.toLowerCase()}`),
          }))
        ),
        cell: ({ row }) => (
          <Badge variant={statusVariant[row.original.status] ?? "outline"}>
            {row.original.status}
          </Badge>
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
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right">{t("common.field.action")}</div>
        ),
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) =>
          row.original.status === "DRAFT" ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => void submit(row.original)}
            >
              <CheckCircle2 className="size-3.5" />
              {t("statistical.submissions.submit")}
            </Button>
          ) : null,
      },
    ],
    [submit, t]
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

  return (
    <ListPageShell
      title={t("statistical.submissions.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("statistical.count", { count: total })}
        </Badge>
      }
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
        <CreateSubmissionDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSaved={() => void refetch()}
        />
      }
    />
  )
}
