import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import type { Group } from "./types"
import { groupsApi } from "./api"
import { downloadFile } from "@workspace/api"
import { GroupMembersDialog } from "./group-members-dialog"
import { GroupRolesDialog } from "./group-roles-dialog"
import { GroupFormDialog } from "./components/GroupFormDialog"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
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
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { useAuthStore } from "@workspace/auth/store"
import { Pencil, ShieldCheck, Trash2, Users } from "lucide-react"
import { groupsListDefinition } from "./list-query"

export function GroupsPage() {
  const { t, formatDate } = useI18n()
  const actorTenantId = useAuthStore((state) => state.user?.tenantId ?? "")
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Group | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null)
  const [memberTarget, setMemberTarget] = useState<Group | null>(null)
  const [roleTarget, setRoleTarget] = useState<Group | null>(null)
  const [deleting, setDeleting] = useState(false)

  const columns = useMemo<ColumnDef<Group>[]>(
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
          placeholder: t("iam.groups.search_placeholder"),
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
        id: "member_count",
        accessorKey: "memberCount",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.groups.field.members")}
          />
        ),
      },
      {
        id: "role_count",
        accessorKey: "roleCount",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.groups.field.roles")}
          />
        ),
      },
      {
        id: "created_at",
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.created")}
          />
        ),
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right">{t("common.field.action")}</div>
        ),
        cell: ({ row }) => {
          const group = row.original
          return (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => setMemberTarget(group)}
                title={t("admin.groups.action.members")}
              >
                <Users className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => setRoleTarget(group)}
                title={t("admin.groups.action.roles")}
              >
                <ShieldCheck className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => {
                  setEditTarget(group)
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
                disabled={group.isSystem}
                onClick={() => setDeleteTarget(group)}
                title={t("common.action.delete")}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          )
        },
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [formatDate, t]
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
    query,
  } = useServerDataTable<Group>({
    ...groupsListDefinition,
    columns,
    queryFn: async (query) =>
      groupsApi.listGroups({
        page: query.page,
        perPage: query.perPage,
        q: query.q === undefined ? undefined : String(query.q),
        status: query.status === undefined ? undefined : String(query.status),
        sort: query.sort,
        order: query.order,
        tenantId: actorTenantId,
      }),
  })

  const handleDelete = async (group: Group) => {
    setDeleting(true)
    try {
      await groupsApi.deleteGroup(group.id, group.tenantId)
      notify.success(t("admin.groups.delete_success"))
      setDeleteTarget(null)
      await refetch()
    } catch (err) {
      notify.error(t("admin.groups.delete_failed"), translateApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  const openCreate = () => {
    setEditTarget(null)
    setFormOpen(true)
  }

  const dialogs = (
    <>
      <GroupFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        group={editTarget}
        onSaved={() => void refetch()}
      />

      <GroupMembersDialog
        group={memberTarget}
        open={memberTarget !== null}
        onOpenChange={(nextOpen) => !nextOpen && setMemberTarget(null)}
      />

      <GroupRolesDialog
        group={roleTarget}
        open={roleTarget !== null}
        onOpenChange={(nextOpen) => !nextOpen && setRoleTarget(null)}
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
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              {t("common.action.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  return (
    <ListPageShell
      title={t("admin.groups.title")}
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("admin.groups.count", { count: total })}
        </Badge>
      }
      criticalPending={isLoading}
      criticalError={loadError}
      onRetry={() => void refetch()}
      loadErrorTitle={t("admin.groups.load_failed")}
      fetching={isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={openCreate}
          createLabel={t("admin.groups.create")}
          exportFilename={t("admin.groups.title")}
          sheetName={t("admin.groups.title")}
          totalRowsCount={total}
          onServerExport={async ({ format, filename }) => {
            const exportUrl = groupsApi.getExportUrl({
              q: query.q === undefined ? undefined : String(query.q),
              status:
                query.status === undefined ? undefined : String(query.status),
              format,
              tenantId: actorTenantId,
            })
            await downloadFile(exportUrl, {
              filename: filename
                ? filename.endsWith(`.${format}`)
                  ? filename
                  : `${filename}.${format}`
                : undefined,
              fallbackFilename: `groups_export.${format}`,
            })
          }}
        />
      }
      dialogs={dialogs}
    />
  )
}
