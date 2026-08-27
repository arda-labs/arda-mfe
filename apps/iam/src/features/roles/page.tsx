import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useAuthStore } from "@workspace/auth/store"
import { rolesApi } from "./api"
import type { Role } from "./types"
import { notify } from "@workspace/ui/feedback/notify"
import { translateApiError, useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
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
import { useServerDataTable } from "@workspace/admin-list/server-data-table"
import { ListPageShell } from "@workspace/admin-list/list-page-shell"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"
import { ShieldCheck, Trash2 } from "lucide-react"
import { rolesListDefinition } from "./list-query"
import { CreateRoleDialog } from "./components/CreateRoleDialog"
import { RolePermissionsDialog } from "./components/RolePermissionsDialog"

export function RolesPage() {
  const { t } = useI18n()
  const actorTenantId = useAuthStore((state) => state.user?.tenantId ?? "")
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [permissionTarget, setPermissionTarget] = useState<Role | null>(null)
  const [deleting, setDeleting] = useState(false)

  const columns = useMemo<ColumnDef<Role>[]>(
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
        enableColumnFilter: true,
        meta: {
          label: t("common.field.code"),
          variant: "text",
          placeholder: t("common.field.code"),
        },
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.code}</span>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.name")}
          />
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
        meta: {
          label: t("common.field.status"),
          variant: "multiSelect",
          options: [
            { label: t("admin.users.status.active"), value: "ACTIVE" },
            { label: t("admin.users.status.disabled"), value: "DISABLED" },
          ],
        },
        cell: ({ row }) => (
          <Status
            variant={row.original.status === "ACTIVE" ? "success" : "default"}
          >
            <StatusIndicator />
            <StatusLabel>{row.original.status || "-"}</StatusLabel>
          </Status>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">{t("common.field.action")}</div>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              onClick={() => setPermissionTarget(row.original)}
              title="Phân quyền"
            >
              <ShieldCheck className="size-3.5" />
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
   * placeholder handled by @workspace/admin-list. The page owns columns,
   * dialogs and the delete action only.
   */
  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
  } = useServerDataTable<Role>({
    ...rolesListDefinition,
    columns,
    queryFn: async (query) =>
      rolesApi.listRoles({
        page: query.page,
        perPage: query.perPage,
        q: query.q === undefined ? undefined : String(query.q),
        status: query.status === undefined ? undefined : String(query.status),
        tenantId: actorTenantId,
      }),
  })

  const handleDelete = useCallback(
    async (target: Role) => {
      if (!target) return
      setDeleting(true)
      try {
        await rolesApi.deleteRole(target.id, target.tenantId)
        notify.success("Đã xóa vai trò")
        setDeleteTarget(null)
        await refetch()
      } catch (err) {
        notify.error("Không xóa được vai trò", translateApiError(err))
      } finally {
        setDeleting(false)
      }
    },
    [refetch]
  )

  return (
    <ListPageShell
      title={t("admin.roles.title")}
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("admin.roles.count", { count: total })}
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
          createLabel={t("admin.roles.create")}
        />
      }
      dialogs={
        <>
          <CreateRoleDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={() => void refetch()}
          />
          <RolePermissionsDialog
            role={permissionTarget}
            onClose={() => setPermissionTarget(null)}
          />
          <AlertDialog
            open={deleteTarget !== null}
            onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("common.confirm.delete_title")}</AlertDialogTitle>
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