import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { textSearchMeta } from "@workspace/list-page/column-filters"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { formatDateShort } from "@workspace/format"
import { statisticalApi, type ReportDefinition } from "../api"
import { reportDefinitionsListDefinition } from "./list-query"
import { ReportDefinitionFormDialog } from "./components/ReportDefinitionFormDialog"

/**
 * Report definitions (QCMS, Q8): query_id → Go builders, Excel template via
 * media. Server tier; create/edit via the BE upsert endpoint (no delete).
 */
export function ReportDefinitionsPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ReportDefinition | null>(null)

  const columns = useMemo<ColumnDef<ReportDefinition>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("common.field.code"),
          t("statistical.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.code}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("statistical.report_definitions.field.name")}
          />
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "group_code",
        accessorKey: "group_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("statistical.indicators.field.group")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.group_code || "—"}
          </span>
        ),
      },
      {
        id: "query_id",
        accessorKey: "query_id",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("statistical.report_definitions.field.query_id")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.query_id}</span>
        ),
      },
      {
        id: "output_format",
        accessorKey: "output_format",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("statistical.report_definitions.field.output_format")}
          />
        ),
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.output_format}</Badge>
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
          <span className="whitespace-nowrap text-muted-foreground">
            {formatDateShort(row.original.created_at)}
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
          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline"
              onClick={() => setEditTarget(row.original)}
            >
              {t("common.action.edit")}
            </button>
          </div>
        ),
      },
    ],
    [t]
  )

  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
  } = useServerDataTable<ReportDefinition>({
    ...reportDefinitionsListDefinition,
    columns,
    queryFn: async (q) =>
      statisticalApi.listReportDefinitions({
        page: q.page,
        perPage: q.perPage,
        q: q.q === undefined ? undefined : String(q.q),
        sort: q.sort,
        order: q.order,
      }),
  })

  return (
    <ListPageShell
      title={t("statistical.report_definitions.title")}
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
          createLabel={t("statistical.report_definitions.create")}
          exportFilename={t("statistical.report_definitions.title")}
          sheetName={t("statistical.report_definitions.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <>
          <ReportDefinitionFormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            definition={null}
            onSaved={() => void refetch()}
          />
          <ReportDefinitionFormDialog
            open={editTarget !== null}
            onOpenChange={(nextOpen) => !nextOpen && setEditTarget(null)}
            definition={editTarget}
            onSaved={() => void refetch()}
          />
        </>
      }
    />
  )
}
