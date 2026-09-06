import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { getMenuIcon } from "@workspace/ui/config/menu-icons"
import type { PlatformMenuItem } from "./api"
import { deleteMenuItem, fetchMenuItems } from "./api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
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
import { Edit2, Trash2 } from "lucide-react"
import { ListPageShell } from "@workspace/admin-list/list-page-shell"
import { textSearchMeta } from "@workspace/admin-list/column-filters"
import { useClientListTable } from "@workspace/admin-list/client-list"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"
import { MenuFormDialog } from "./components/MenuFormDialog"

type MenuRow = PlatformMenuItem & { depth: number; overridden: boolean }

/** Flatten rows in tree order (sort_order, code) with depth for indentation. */
function toTreeRows(items: PlatformMenuItem[]): MenuRow[] {
  const byId = new Map(items.map((item) => [item.id, item]))
  const globalCodes = new Set(
    items.filter((item) => !item.tenant_id).map((item) => item.code)
  )
  const childrenOf = new Map<string, PlatformMenuItem[]>()
  const roots: PlatformMenuItem[] = []
  for (const item of items) {
    const parent = item.parent_id ? byId.get(item.parent_id) : undefined
    if (parent) {
      childrenOf.set(parent.id, [...(childrenOf.get(parent.id) ?? []), item])
    } else {
      roots.push(item)
    }
  }
  const ordered = [...items].sort(
    (a, b) =>
      a.sort_order !== b.sort_order
        ? a.sort_order - b.sort_order
        : a.code.localeCompare(b.code)
  )
  const sortNodes = (nodes: PlatformMenuItem[]) =>
    nodes.sort(
      (a, b) =>
        ordered.indexOf(a) - ordered.indexOf(b)
    )

  const flat: MenuRow[] = []
  const walk = (nodes: PlatformMenuItem[], depth: number) => {
    for (const node of sortNodes(nodes)) {
      flat.push({
        ...node,
        depth,
        overridden: Boolean(node.tenant_id) && globalCodes.has(node.code),
      })
      walk(childrenOf.get(node.id) ?? [], depth + 1)
    }
  }
  walk(roots, 0)
  return flat
}

const DEFAULT_PAGE_SIZE = 50

export function MenusPage() {
  const { t } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PlatformMenuItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MenuRow | null>(null)
  const [rows, setRows] = useState<MenuRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [deleting, setDeleting] = useState(false)

  const loadMenus = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      const items = await fetchMenuItems()
      setRows(toTreeRows(items))
    } catch (reason) {
      setLoadError(reason)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadMenus(true)
  }, [loadMenus])

  const openCreate = () => {
    setEditingItem(null)
    setDialogOpen(true)
  }

  const openEdit = (item: MenuRow) => {
    setEditingItem(item)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteMenuItem(deleteTarget.id)
      notify.success(t("platform.menus.toast.delete_success"))
      setDeleteTarget(null)
      await loadMenus()
    } catch (err) {
      notify.error(
        t("platform.menus.toast.delete_failed"),
        translateApiError(err)
      )
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo<ColumnDef<MenuRow>[]>(
    () => [
      {
        id: "title",
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.menus.field.title")}
          />
        ),
        enableColumnFilter: true,
        enableSorting: false,
        meta: textSearchMeta(
          t("platform.menus.field.title"),
          t("platform.menus.placeholder.search")
        ),
        cell: ({ row }) => {
          const item = row.original
          const Icon = getMenuIcon(item.icon)
          return (
            <div
              className="flex min-w-0 items-center gap-2"
              style={{ paddingLeft: `${item.depth * 20}px` }}
            >
              <Icon className="size-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {item.title}
                </div>
                {item.path ? (
                  <div className="truncate font-mono text-[11px] text-muted-foreground">
                    {item.path}
                  </div>
                ) : null}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.menus.field.code")}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {row.original.code}
          </span>
        ),
      },
      {
        id: "scope",
        header: () => (
          <div className="text-xs font-semibold text-foreground/80">
            {t("platform.menus.field.scope")}
          </div>
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const item = row.original
          if (item.overridden) {
            return (
              <Badge variant="default" className="text-xs font-semibold">
                {t("platform.menus.scope.override")}
              </Badge>
            )
          }
          if (item.tenant_id) {
            return (
              <Badge variant="secondary" className="text-xs font-semibold">
                {t("platform.menus.scope.tenant")}
              </Badge>
            )
          }
          return (
            <Badge variant="outline" className="text-xs font-normal">
              {t("platform.menus.scope.default")}
            </Badge>
          )
        },
      },
      {
        accessorKey: "required_permission",
        header: () => (
          <div className="text-xs font-semibold text-foreground/80">
            {t("platform.menus.field.required_permission")}
          </div>
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.required_permission || "-"}
          </span>
        ),
      },
      {
        accessorKey: "sort_order",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.menus.field.sort_order")}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "is_active",
        header: () => (
          <div className="text-xs font-semibold text-foreground/80">
            {t("platform.menus.field.status")}
          </div>
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <Status variant={row.original.is_active ? "success" : "default"}>
            <StatusIndicator />
            <StatusLabel>
              {row.original.is_active
                ? t("platform.menus.status.active")
                : t("platform.menus.status.inactive")}
            </StatusLabel>
          </Status>
        ),
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right text-xs font-semibold text-foreground/80">
            {t("common.field.action")}
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              title={t("common.action.edit")}
              onClick={() => openEdit(row.original)}
            >
              <Edit2 className="size-3.5" />
            </Button>
            {row.original.tenant_id ? (
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-destructive"
                title={t("common.action.delete")}
                onClick={() => setDeleteTarget(row.original)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            ) : null}
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [t]
  )

  const { table, total } = useClientListTable({
    columns,
    items: rows,
    filterBy: {
      title: (item, value) => {
        const needle = (Array.isArray(value) ? value[0] : value ?? "")
          .toLowerCase()
        return [item.title, item.code, item.path, item.required_permission]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      },
    },
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const dialogs = (
    <>
      <MenuFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rows={rows}
        editingItem={editingItem}
        onSuccess={loadMenus}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("platform.menus.delete.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("platform.menus.delete.description", {
                title: deleteTarget?.title ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("platform.menus.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  return (
    <ListPageShell
      title={t("platform.menus.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {t("platform.menus.count", { count: total })}
        </Badge>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={loadMenus}
      loadErrorTitle={t("platform.menus.load_failed")}
      fetching={refreshing}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={openCreate}
          createLabel={t("platform.menus.create")}
        />
      }
      dialogs={dialogs}
    />
  )
}
