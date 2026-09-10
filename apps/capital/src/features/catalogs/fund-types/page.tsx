import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { textSearchMeta } from "@workspace/list-page/column-filters"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { capitalApi, type FundType } from "../../api"
import { catalogsListDefinition } from "../list-query"
import { FundTypeDialog } from "./components/FundTypeDialog"

/** CFM fund-type catalog (loại vốn). */
export function FundTypesPage() {
  const { t } = useI18n()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<FundType | null>(null)

  const columns = useMemo<ColumnDef<FundType>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("common.field.code"), t("capital.placeholder.search")),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">{row.original.code}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.name")} />
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "is_active",
        accessorKey: "is_active",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.status")} />
        ),
        cell: ({ row }) => (
          <Status variant={row.original.is_active ? "success" : "default"}>
            <StatusIndicator />
            <StatusLabel>
              {row.original.is_active
                ? t("capital.catalogs.is_active")
                : t("capital.catalogs.is_inactive")}
            </StatusLabel>
          </Status>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">{t("common.field.action")}</div>,
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
  } = useServerDataTable<FundType>({
    ...catalogsListDefinition,
    queryKey: ["capital", "fund-types", "list"],
    columns,
    queryFn: async () => capitalApi.listFundTypes(true),
  })

  return (
    <ListPageShell
      title={t("capital.fund_types.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("capital.count", { count: total })}
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
          createLabel={t("capital.fund_types.create")}
          exportFilename={t("capital.fund_types.title")}
          sheetName={t("capital.fund_types.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <>
          <FundTypeDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            fundType={null}
            onSaved={() => void refetch()}
          />
          <FundTypeDialog
            open={editTarget !== null}
            onOpenChange={(next) => !next && setEditTarget(null)}
            fundType={editTarget}
            onSaved={() => void refetch()}
          />
        </>
      }
    />
  )
}
