import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
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
import { Button } from "@workspace/ui/components/button"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { DataTableSkeleton } from "@workspace/ui/components/data-table/data-table-skeleton"
import { PageHeader } from "@workspace/ui/components/page-header"
import {
  activeStatusMeta,
  matchBooleanActiveFilter,
  matchTextColumnFilter,
  textSearchMeta,
} from "@workspace/admin-list/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/admin-list/client-list"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Edit2, Plus, Trash2 } from "lucide-react"
import {
  mdmApi,
  mdmCatalogs,
  type MdmCatalogKey,
  type MdmItem,
} from "../api"
import { MdmItemDialog } from "./components/MdmItemDialog"

const DEFAULT_PAGE_SIZE = 10

export function MdmPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const [catalog, setCatalog] = useState<MdmCatalogKey>("currencies")
  const [items, setItems] = useState<MdmItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MdmItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MdmItem | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const result = await mdmApi.listItems(catalog)
      setItems(result.items)
    } catch (error) {
      notify.error(translateApiError(error, t("mdm.load_failed")))
    } finally {
      setLoading(false)
    }
  }, [catalog, t])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (item: MdmItem) => {
    setEditing(item)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeletePending(true)
    try {
      await mdmApi.deleteItem(catalog, deleteTarget.id)
      notify.success(t("mdm.deleted"))
      setDeleteTarget(null)
      await loadItems()
    } catch (error) {
      notify.error(translateApiError(error, t("mdm.delete_failed")))
    } finally {
      setDeletePending(false)
    }
  }

  const columns = useMemo<ColumnDef<MdmItem>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("mdm.field.code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("mdm.field.code"), t("mdm.placeholder.search")),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">
            {row.original.code}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("mdm.field.name")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("mdm.field.name"), t("mdm.placeholder.search")),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "scope",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("mdm.field.scope")} />
        ),
        cell: ({ row }) =>
          row.original.tenant_id ? (
            <Badge variant="outline">{row.original.tenant_id}</Badge>
          ) : (
            <Badge variant="secondary">{t("mdm.scope.global")}</Badge>
          ),
      },
      {
        id: "is_active",
        accessorKey: "is_active",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("mdm.field.status")} />
        ),
        enableColumnFilter: true,
        meta: activeStatusMeta(t("mdm.field.status"), t("mdm.status.active"), t("mdm.status.inactive")),
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "outline"}>
            {row.original.is_active
              ? t("mdm.status.active")
              : t("mdm.status.inactive")}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: t("mdm.field.actions"),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.tenant_id ? (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => openEdit(row.original)}
              >
                <Edit2 className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-destructive"
                onClick={() => setDeleteTarget(row.original)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              {t("mdm.scope.readonly")}
            </span>
          ),
      },
    ],
    [t]
  )

  const { table, total } = useClientListTable({
    columns,
    items,
    filterBy: {
      code: (item, value) => matchTextColumnFilter(value, item.code),
      name: (item, value) => matchTextColumnFilter(value, item.name),
      is_active: (item, value) => matchBooleanActiveFilter(item, value),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        code: (a, b) => a.code.localeCompare(b.code),
        name: (a, b) => a.name.localeCompare(b.name),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
      <PageHeader
        title={t("mdm.title")}
        description={t("mdm.description")}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            {t("mdm.create")}
          </Button>
        }
      />

      <div className="max-w-sm">
        <Select
          value={catalog}
          onValueChange={(value) => setCatalog(value as MdmCatalogKey)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {mdmCatalogs.map((entry) => (
              <SelectItem key={entry.key} value={entry.key}>
                {t(entry.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="relative min-h-0 flex-1">
        {loading ? (
          <DataTableSkeleton columnCount={5} rowCount={6} />
        ) : (
          <DataTable table={table} totalRows={total} className="min-h-0 flex-1">
            <ListTableToolbar
              table={table}
              onCreate={openCreate}
              createLabel={t("mdm.create")}
            />
          </DataTable>
        )}
      </div>

      <MdmItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        catalog={catalog}
        editing={editing}
        onSaved={loadItems}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("mdm.delete_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("mdm.delete_confirm_description").replace(
                "{code}",
                deleteTarget?.code ?? ""
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("mdm.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePending}
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
            >
              {t("mdm.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
