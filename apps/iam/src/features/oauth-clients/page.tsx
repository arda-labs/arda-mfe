import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"
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
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { notify } from "@workspace/ui/feedback/notify"
import {
  matchTextColumnFilter,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import {
  sortByColumn,
  useClientListTable,
} from "@workspace/list-page/client-list"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { oauthClientsApi, type OAuthClient } from "./api"
import { OAuthClientDialog } from "./components/OAuthClientDialog"

const DEFAULT_PAGE_SIZE = 10

/**
 * OAuth2 client registry (Hydra admin proxy, X3).
 * `GET /api/admin/oauth-clients` is unpaged (the complete Hydra client set),
 * so this is a client tier list: filter/sort/paginate in memory behind the
 * shared DataTable + ListPageShell, URL-synced via useClientListTable.
 */
export function OAuthClientsPage() {
  const { t } = useI18n()
  /** `undefined` = closed, `null` = create, client = edit. */
  const [formTarget, setFormTarget] = useState<OAuthClient | null | undefined>(
    undefined
  )
  const [deleteTarget, setDeleteTarget] = useState<OAuthClient | null>(null)
  const [deleting, setDeleting] = useState(false)

  const query = useQuery({
    queryKey: ["iam", "oauth-clients", "list"],
    queryFn: oauthClientsApi.list,
  })
  const items = useMemo(() => query.data?.items ?? [], [query.data])

  const columns = useMemo<ColumnDef<OAuthClient>[]>(
    () => [
      {
        id: "client_id",
        accessorKey: "client_id",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.oauth_clients.field.client_id")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("admin.oauth_clients.field.client_id"),
          t("admin.oauth_clients.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {row.original.client_id}
          </span>
        ),
      },
      {
        id: "client_name",
        accessorKey: "client_name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.oauth_clients.field.client_name")}
          />
        ),
        cell: ({ row }) => row.original.client_name || "—",
      },
      {
        id: "grant_types",
        accessorKey: "grant_types",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.oauth_clients.field.grant_types")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {(row.original.grant_types ?? []).join(", ") || "—"}
          </span>
        ),
      },
      {
        id: "scope",
        accessorKey: "scope",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.oauth_clients.field.scope")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.scope || "—"}</span>
        ),
      },
      {
        id: "redirect_uris",
        accessorKey: "redirect_uris",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.oauth_clients.field.redirect_uris")}
          />
        ),
        cell: ({ row }) => {
          const uris = (row.original.redirect_uris ?? []).join(", ")
          return (
            <span className="block max-w-[280px] truncate font-mono text-xs" title={uris || undefined}>
              {uris || "—"}
            </span>
          )
        },
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right">{t("common.field.action")}</div>
        ),
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              title={t("common.action.edit")}
              onClick={() => setFormTarget(row.original)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:bg-red-50/50 hover:text-red-600"
              title={t("common.action.delete")}
              onClick={() => setDeleteTarget(row.original)}
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

  const { table, total } = useClientListTable<OAuthClient>({
    columns,
    items,
    filterBy: {
      client_id: (item, value) =>
        matchTextColumnFilter(value, item.client_id, item.client_name),
    },
    sort: (rows, sorting) =>
      sortByColumn(rows, sorting, {
        client_id: (a, b) => a.client_id.localeCompare(b.client_id),
        client_name: (a, b) =>
          (a.client_name ?? "").localeCompare(b.client_name ?? ""),
        grant_types: (a, b) =>
          (a.grant_types ?? []).join(",").localeCompare((b.grant_types ?? []).join(",")),
        scope: (a, b) => (a.scope ?? "").localeCompare(b.scope ?? ""),
        redirect_uris: (a, b) =>
          (a.redirect_uris ?? [])
            .join(",")
            .localeCompare((b.redirect_uris ?? []).join(",")),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await oauthClientsApi.remove(deleteTarget.client_id)
      notify.success(t("common.feedback.delete_success"))
      setDeleteTarget(null)
      await query.refetch()
    } catch (err) {
      notify.error(t("common.feedback.delete_failed"), translateApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <ListPageShell
      title={t("admin.oauth_clients.title")}
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("admin.oauth_clients.count", { count: total })}
        </Badge>
      }
      header={
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("admin.oauth_clients.description")}
        </p>
      }
      criticalPending={query.isPending}
      criticalError={query.error}
      onRetry={() => void query.refetch()}
      loadErrorTitle={t("admin.oauth_clients.load_failed")}
      fetching={query.isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setFormTarget(null)}
          createLabel={t("admin.oauth_clients.create")}
          exportFilename={t("admin.oauth_clients.title")}
          sheetName={t("admin.oauth_clients.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <>
          {formTarget !== undefined ? (
            <OAuthClientDialog
              key={formTarget?.client_id ?? "create"}
              open
              client={formTarget}
              onOpenChange={(nextOpen) => !nextOpen && setFormTarget(undefined)}
              onSaved={async () => {
                await query.refetch()
                setFormTarget(undefined)
              }}
            />
          ) : null}

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
                    item: deleteTarget?.client_id ?? "",
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
                  onClick={() => void handleDelete()}
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
