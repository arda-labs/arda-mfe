import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useSearchParams } from "react-router-dom"
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
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import {
  activeStatusMeta,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Edit2, Trash2 } from "lucide-react"
import {
  mdmApi,
  mdmCatalogs,
  type MdmCatalogKey,
  type MdmItem,
} from "../api"
import { mdmListDefinition } from "./list-query"
import { MdmItemDialog } from "./components/MdmItemDialog"

/** URL/list params that must not leak across catalog switches. */
const LIST_URL_KEYS = ["page", "perPage", "sort", "code", "is_active"]

export function MdmPage(_props: { pathname: string }) {
  const { t, formatDate } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const [catalog, setCatalog] = useState<MdmCatalogKey>("currencies")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MdmItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MdmItem | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const switchCatalog = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams)
      for (const key of LIST_URL_KEYS) next.delete(key)
      setCatalog(value as MdmCatalogKey)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const columns = useMemo<ColumnDef<MdmItem>[]>(
    () => [
      {
        id: "code",
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
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("mdm.field.name")} />
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "scope",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("mdm.field.scope")} />
        ),
        enableSorting: false,
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
        enableSorting: false,
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
        id: "created_at",
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.created")} />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {row.original.created_at ? formatDate(row.original.created_at) : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">{t("mdm.field.actions")}</div>,
        enableSorting: false,
        cell: ({ row }) =>
          row.original.tenant_id ? (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => {
                  setEditing(row.original)
                  setDialogOpen(true)
                }}
                title={t("common.action.edit")}
              >
                <Edit2 className="size-3.5" />
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
          ) : (
            <span className="text-xs text-muted-foreground">
              {t("mdm.scope.readonly")}
            </span>
          ),
      },
    ],
    [formatDate, t]
  )

  /**
   * Server-driven list controller: URL page/perPage + `code`→q + `is_active`
   * filters <-> TanStack Query cache. The current catalog is part of the
   * query key so ~20 catalogs keep independent cache entries; `all=true` is
   * gone — every request is one page from the BE whitelist contract.
   */
  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
  } = useServerDataTable<MdmItem>({
    ...mdmListDefinition,
    queryKey: [...mdmListDefinition.queryKey, catalog],
    columns,
    queryFn: async (query) =>
      mdmApi.listItems(catalog, {
        page: query.page,
        perPage: query.perPage,
        q: query.q === undefined ? undefined : String(query.q),
        is_active:
          query.is_active === undefined ? undefined : String(query.is_active),
        sort: query.sort,
        order: query.order,
      }),
  })

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeletePending(true)
    try {
      await mdmApi.deleteItem(catalog, deleteTarget.id)
      notify.success(t("mdm.deleted"))
      setDeleteTarget(null)
      await refetch()
    } catch (error) {
      notify.error(translateApiError(error, t("mdm.delete_failed")))
    } finally {
      setDeletePending(false)
    }
  }, [catalog, deleteTarget, refetch, t])

  return (
    <ListPageShell
      title={t("mdm.title")}
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("mdm.count", { count: total })}
        </Badge>
      }
      criticalPending={isLoading}
      criticalError={loadError}
      onRetry={() => void refetch()}
      loadErrorTitle={t("mdm.load_failed")}
      fetching={isFetching}
      table={table}
      header={
        <div className="max-w-sm">
          <Select value={catalog} onValueChange={switchCatalog}>
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
      }
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={openCreate}
          createLabel={t("mdm.create")}
          exportFilename={t("mdm.title")}
          sheetName={t("mdm.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <>
          <MdmItemDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            catalog={catalog}
            editing={editing}
            onSaved={async () => {
              await refetch()
            }}
          />

          <AlertDialog
            open={Boolean(deleteTarget)}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("mdm.delete_confirm_title")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("mdm.delete_confirm_description", {
                    code: deleteTarget?.code ?? "",
                  })}
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
        </>
      }
    />
  )
}
