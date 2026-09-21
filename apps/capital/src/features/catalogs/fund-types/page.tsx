import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { translateApiError, useI18n } from "@workspace/i18n"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Badge } from "@workspace/ui/components/badge"
import { notify } from "@workspace/ui/feedback/notify"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import {
  matchTextColumnFilter,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import {
  sortByColumn,
  useClientListTable,
} from "@workspace/list-page/client-list"
import { useServerList } from "@workspace/list-page/server-list"
import { capitalApi, type FundType } from "../../api"
import { FundTypeDialog } from "./components/FundTypeDialog"

const DEFAULT_PAGE_SIZE = 10

/**
 * CFM fund-type catalog (loại vốn). `GET /api/capital/fund-types` returns the
 * complete set (no page/per_page), so this is a client tier list: one query for
 * all rows, then filter/sort/paginate in memory.
 */
export function FundTypesPage() {
  const { t } = useI18n()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<FundType | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<FundType | null>(null)
  const [deactivating, setDeactivating] = useState(false)

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
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline"
              onClick={() => setEditTarget(row.original)}
            >
              {t("common.action.edit")}
            </button>
            {row.original.is_active ? (
              <button
                type="button"
                className="text-xs font-semibold text-destructive hover:underline"
                onClick={() => setDeactivateTarget(row.original)}
              >
                {t("capital.fund_types.deactivate")}
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [t]
  )

  const {
    items,
    isPending,
    isFetching,
    error: loadError,
    refetch,
  } = useServerList<FundType>({
    queryKey: ["capital", "fund-types", "list"],
    query: {},
    queryFn: () => capitalApi.listFundTypes(true),
  })

  const { table, total } = useClientListTable<FundType>({
    columns,
    items,
    filterBy: {
      code: (item, value) => matchTextColumnFilter(value, item.code, item.name),
    },
    sort: (rows, sorting) =>
      sortByColumn(rows, sorting, {
        code: (a, b) => a.code.localeCompare(b.code),
        name: (a, b) => a.name.localeCompare(b.name),
        is_active: (a, b) => Number(a.is_active) - Number(b.is_active),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const handleDeactivate = async () => {
    if (!deactivateTarget) return
    setDeactivating(true)
    try {
      await capitalApi.deactivateFundType(deactivateTarget.id)
      notify.success(t("capital.fund_types.deactivate_success"))
      setDeactivateTarget(null)
      await refetch()
    } catch (err) {
      notify.error(
        t("capital.fund_types.deactivate_failed"),
        translateApiError(err)
      )
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <ListPageShell
      title={t("capital.fund_types.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("capital.count", { count: total })}
        </Badge>
      }
      criticalPending={isPending}
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
          <AlertDialog
            open={deactivateTarget !== null}
            onOpenChange={(next) => !next && setDeactivateTarget(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("common.confirm.delete_title")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("common.confirm.delete_description", {
                    item: deactivateTarget?.name ?? "",
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deactivating}
                  onClick={() => void handleDeactivate()}
                >
                  {t("capital.fund_types.deactivate")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      }
    />
  )
}
