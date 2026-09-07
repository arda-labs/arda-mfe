import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import type { Permission } from "./types"
import { permissionsApi } from "./api"
import { downloadFile } from "@workspace/api"
import { permissionsListDefinition } from "./list-query"
import { notify } from "@workspace/ui/feedback/notify"
import { translateApiError, useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { textSearchMeta } from "@workspace/list-page/column-filters"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
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
import { CreatePermissionDialog } from "./components/CreatePermissionDialog"
import { Trash2 } from "lucide-react"

export function PermissionsPage() {
  const { t } = useI18n()
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Permission | null>(null)
  const [deleting, setDeleting] = useState(false)

  const columns = useMemo<ColumnDef<Permission>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label={t("common.action.select_all")}
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={t("common.action.select_row")}
            className="translate-y-[2px]"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.code")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.code}</span>
        ),
      },
      {
        id: "module",
        accessorKey: "module",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.field.module")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("admin.field.module"), t("admin.field.module")),
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.module}</span>
        ),
      },
      {
        accessorKey: "resource",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.resource")}
          />
        ),
      },
      {
        id: "action",
        accessorKey: "operation",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.operation")}
          />
        ),
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
   * Server-driven list controller: URL page/perPage + `module`→q filters <->
   * TanStack Query cache, cancellation, dedupe and previous-page placeholder
   * handled by @workspace/list-page. The page owns columns and dialogs only.
   */
  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
    query,
  } = useServerDataTable<Permission>({
    ...permissionsListDefinition,
    columns,
    queryFn: async (query) =>
      permissionsApi.listPermissions({
        page: query.page,
        perPage: query.perPage,
        q: query.q === undefined ? undefined : String(query.q),
        sort: query.sort,
        order: query.order,
      }),
  })

  const handleDelete = useCallback(
    async (id: string) => {
      setDeleting(true)
      try {
        await permissionsApi.deletePermission(id)
        notify.success(t("iam.permissions.delete_success"))
        setDeleteTarget(null)
        await refetch()
      } catch (err) {
        notify.error(t("iam.permissions.delete_failed"), translateApiError(err))
      } finally {
        setDeleting(false)
      }
    },
    [refetch, t]
  )

  return (
    <ListPageShell
      title={t("admin.permissions.title")}
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("admin.permissions.count", { count: total })}
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
          createLabel={t("admin.permissions.create")}
          exportFilename={t("admin.permissions.title")}
          sheetName={t("admin.permissions.title")}
          totalRowsCount={total}
          onServerExport={async ({ format, filename }) => {
            const exportUrl = permissionsApi.getExportUrl({
              q: query.q === undefined ? undefined : String(query.q),
              sort: query.sort,
              order: query.order,
              format,
            })
            await downloadFile(exportUrl, {
              filename: filename ? (filename.endsWith(`.${format}`) ? filename : `${filename}.${format}`) : undefined,
              fallbackFilename: `permissions_export.${format}`,
            })
          }}
        />
      }
      dialogs={
        <>
          <CreatePermissionDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={() => void refetch()}
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
                <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleting}
                  onClick={() => deleteTarget && void handleDelete(deleteTarget.id)}
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
