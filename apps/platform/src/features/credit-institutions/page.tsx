import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import type { CreditInstitution } from "../api"
import { platformApi } from "../api"
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
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import {
  multiSelectFilterMeta,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { creditInstitutionsListDefinition } from "./list-query"
import { CreditInstitutionFormDialog } from "./components/CreditInstitutionFormDialog"

export function CreditInstitutionsPage() {
  const { t, formatDate } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CreditInstitution | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CreditInstitution | null>(
    null
  )
  const [deleting, setDeleting] = useState(false)

  const columns = useMemo<ColumnDef<CreditInstitution>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.credit_institutions.field.code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("platform.credit_institutions.field.code"),
          t("platform.credit_institutions.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.code}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.credit_institutions.field.name")}
          />
        ),
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.address}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "short_name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.credit_institutions.field.short_name")}
          />
        ),
        cell: ({ row }) => row.original.short_name || "-",
      },
      {
        accessorKey: "license_no",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.credit_institutions.field.license_no")}
          />
        ),
        cell: ({ row }) => row.original.license_no || "-",
      },
      {
        accessorKey: "tax_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.credit_institutions.field.tax_code")}
          />
        ),
        cell: ({ row }) => row.original.tax_code || "-",
      },
      {
        accessorKey: "effective_from",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.credit_institutions.field.effective_from")}
          />
        ),
        cell: ({ row }) => row.original.effective_from || "-",
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.credit_institutions.field.created_at")}
          />
        ),
        cell: ({ row }) => formatDate(row.original.created_at ?? ""),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.credit_institutions.field.status")}
          />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(
          t("platform.credit_institutions.field.status"),
          [
            {
              label: t("platform.credit_institutions.status.active"),
              value: "active",
            },
            {
              label: t("platform.credit_institutions.status.inactive"),
              value: "inactive",
            },
          ]
        ),
        cell: ({ row }) => (
          <Status
            variant={row.original.status === "active" ? "success" : "default"}
          >
            <StatusIndicator />
            <StatusLabel>
              {row.original.status === "active"
                ? t("platform.credit_institutions.status.active")
                : t("platform.credit_institutions.status.inactive")}
            </StatusLabel>
          </Status>
        ),
      },
      {
        id: "actions",
        header: () => (
          <span className="sr-only">
            {t("platform.credit_institutions.field.actions")}
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              title={t("common.action.edit")}
              onClick={() => {
                setEditingItem(row.original)
                setDialogOpen(true)
              }}
            >
              <Edit2 className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-destructive"
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
  } = useServerDataTable<CreditInstitution>({
    ...creditInstitutionsListDefinition,
    columns,
    queryFn: async (listQuery, { signal }) =>
      platformApi.listCreditInstitutionsPaged(
        {
          page: listQuery.page,
          perPage: listQuery.perPage,
          q: listQuery.q === undefined ? undefined : String(listQuery.q),
          status:
            listQuery.status === undefined
              ? undefined
              : String(listQuery.status),
          sort: listQuery.sort,
          order: listQuery.order,
        },
        { signal }
      ),
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await platformApi.deleteCreditInstitution(deleteTarget.id)
      notify.success(t("platform.credit_institutions.toast.delete_success"))
      setDeleteTarget(null)
      await refetch()
    } catch (err) {
      notify.error(
        t("platform.credit_institutions.toast.delete_failed"),
        translateApiError(err)
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <ListPageShell
      title={t("platform.credit_institutions.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {t("platform.credit_institutions.count", { count: total })}
        </Badge>
      }
      criticalPending={isLoading}
      criticalError={loadError}
      onRetry={() => void refetch()}
      loadErrorTitle={t("platform.credit_institutions.load_failed")}
      fetching={isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => {
            setEditingItem(null)
            setDialogOpen(true)
          }}
          createLabel={t("platform.credit_institutions.create")}
        />
      }
      dialogs={
        <>
          <CreditInstitutionFormDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            editingItem={editingItem}
            onSaved={() => refetch()}
          />

          <AlertDialog
            open={!!deleteTarget}
            onOpenChange={() => setDeleteTarget(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("platform.credit_institutions.delete.title")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("platform.credit_institutions.delete.description", {
                    name: deleteTarget?.name ?? "",
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
                  {t("platform.credit_institutions.delete.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      }
    />
  )
}
