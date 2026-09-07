import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
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
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import {
  textSearchMeta,
  multiSelectFilterMeta,
} from "@workspace/list-page/column-filters"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Pencil, Trash2 } from "lucide-react"
import { hrmApi, type Position } from "../api"
import { positionsListDefinition } from "./list-query"
import { PositionFormDialog } from "./components/PositionFormDialog"

export function PositionsPage() {
  const { t, formatDate } = useI18n()
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Position | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null)
  const [deleting, setDeleting] = useState(false)

  const columns = useMemo<ColumnDef<Position>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("hrm.positions.field.code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("hrm.positions.field.code"),
          t("hrm.positions.search_placeholder")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.code}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("hrm.positions.field.name")}
          />
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("hrm.positions.field.status")}
          />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(t("hrm.positions.field.status"), [
          { label: t("hrm.status.active"), value: "active" },
          { label: t("hrm.status.inactive"), value: "inactive" },
        ]),
        cell: ({ row }) => (
          <Status
            variant={row.original.status === "active" ? "success" : "default"}
          >
            <StatusIndicator />
            <StatusLabel>
              {row.original.status === "active"
                ? t("hrm.status.active")
                : t("hrm.status.inactive")}
            </StatusLabel>
          </Status>
        ),
      },
      {
        id: "is_manager",
        accessorKey: "is_manager",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("hrm.positions.field.is_manager")}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.is_manager
              ? t("hrm.common.yes")
              : t("hrm.common.no")}
          </span>
        ),
      },
      {
        id: "description",
        accessorKey: "description",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("hrm.positions.field.description")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.description || "-"}
          </span>
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
        cell: ({ row }) => formatDate(row.original.created_at ?? ""),
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right">{t("common.field.action")}</div>
        ),
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              onClick={() => {
                setEditTarget(row.original)
                setFormOpen(true)
              }}
              title={t("common.action.edit")}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:bg-red-50/50 hover:text-red-600"
              onClick={() => setDeleteTarget(row.original)}
              title={t("common.action.delete")}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [t]
  )

  /**
   * Server-driven list controller: URL page/perPage + `code`→q + `status`
   * filters <-> TanStack Query cache, cancellation, dedupe and previous-page
   * placeholder handled by @workspace/list-page. The page owns columns,
   * dialogs and the delete action only.
   */
  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
  } = useServerDataTable<Position>({
    ...positionsListDefinition,
    columns,
    queryFn: async (query) =>
      hrmApi.listPositionsPaged({
        page: query.page,
        perPage: query.perPage,
        q: query.q === undefined ? undefined : String(query.q),
        status:
          query.status === undefined ? undefined : String(query.status),
        sort: query.sort,
        order: query.order,
      }),
  })

  const openCreate = () => {
    setEditTarget(null)
    setFormOpen(true)
  }

  const handleDelete = useCallback(
    async (target: Position) => {
      setDeleting(true)
      try {
        await hrmApi.deletePosition(target.id)
        notify.success(t("hrm.positions.delete_success"))
        setDeleteTarget(null)
        await refetch()
      } catch (err) {
        notify.error(t("hrm.positions.delete_failed"), translateApiError(err))
      } finally {
        setDeleting(false)
      }
    },
    [refetch, t]
  )

  return (
    <ListPageShell
      title={t("hrm.positions.title")}
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("hrm.count", { count: total })}
        </Badge>
      }
      criticalPending={isLoading}
      criticalError={loadError}
      onRetry={() => void refetch()}
      loadErrorTitle={t("hrm.positions.load_failed")}
      fetching={isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={openCreate}
          createLabel={t("hrm.positions.create")}
          exportFilename={t("hrm.positions.title")}
          sheetName={t("hrm.positions.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <>
          <PositionFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            position={editTarget}
            onSaved={() => void refetch()}
          />
          <AlertDialog
            open={deleteTarget !== null}
            onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("common.confirm.delete_title")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("common.confirm.delete_description", {
                    item: deleteTarget?.code || deleteTarget?.name || "",
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {t("common.action.cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleting}
                  onClick={() => deleteTarget && handleDelete(deleteTarget)}
                >
                  {t("common.action.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      }
    />
  )
}
