import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import type { Organization, Parameter } from "../api"
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
import { Edit2, Eye, EyeOff, Key, Trash2 } from "lucide-react"
import { ListPageShell } from "@workspace/admin-list/list-page-shell"
import {
  matchTextColumnFilter,
  textSearchMeta,
} from "@workspace/admin-list/column-filters"
import {
  sortByColumn,
  useClientListTable,
} from "@workspace/admin-list/client-list"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"
import { ParameterFormDialog } from "./components/ParameterFormDialog"

const DEFAULT_PAGE_SIZE = 10

export function ParametersPage() {
  const { t } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingParam, setEditingParam] = useState<Parameter | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Parameter | null>(null)
  const [revealedSecrets, setRevealedSecrets] = useState<
    Record<string, boolean>
  >({})
  const [params, setParams] = useState<Parameter[]>([])
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [deleting, setDeleting] = useState(false)

  const loadParameters = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      const [paramsResult, orgsResult] = await Promise.all([
        platformApi.listParameters(),
        platformApi.listOrganizations({ view: "options" }),
      ])
      setParams(paramsResult)
      setOrgs(orgsResult.items)
    } catch (reason) {
      setLoadError(reason)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadParameters(true)
  }, [loadParameters])

  const toggleRevealSecret = (id: string) => {
    setRevealedSecrets((previous) => ({ ...previous, [id]: !previous[id] }))
  }

  const openCreate = () => {
    setEditingParam(null)
    setDialogOpen(true)
  }

  const openEdit = (param: Parameter) => {
    setEditingParam(param)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await platformApi.deleteParameter(deleteTarget.id)
      notify.success(t("platform.parameters.toast.delete_success"))
      setDeleteTarget(null)
      await loadParameters()
    } catch (err) {
      notify.error(t("platform.parameters.toast.delete_failed"), translateApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo<ColumnDef<Parameter>[]>(
    () => [
      {
        id: "key",
        accessorKey: "key",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.parameters.field.key")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("platform.parameters.field.key"),
          t("platform.parameters.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {row.original.key}
          </span>
        ),
      },
      {
        accessorKey: "value",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.parameters.field.value")}
          />
        ),
        cell: ({ row }) => {
          const param = row.original
          const isRevealed = revealedSecrets[param.id]
          if (param.is_secret) {
            return (
              <div className="flex max-w-xs items-center gap-2">
                <Key className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-mono text-xs">
                  {isRevealed
                    ? param.value || t("platform.parameters.secret.empty")
                    : t("platform.parameters.secret.masked")}
                </span>
                <button
                  type="button"
                  onClick={() => toggleRevealSecret(param.id)}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  {isRevealed ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                </button>
              </div>
            )
          }
          if (param.value_type === "boolean") {
            return (
              <Status variant={param.value === "true" ? "success" : "default"}>
                <StatusIndicator />
                <StatusLabel>
                  {param.value === "true"
                    ? t("platform.parameters.boolean.true")
                    : t("platform.parameters.boolean.false")}
                </StatusLabel>
              </Status>
            )
          }
          if (param.value_type === "json") {
            return (
              <code className="rounded border border-muted/80 bg-muted/30 px-1.5 py-0.5 text-xs">
                JSON
              </code>
            )
          }
          return (
            <span className="max-w-xs truncate font-mono text-xs">
              {param.value}
            </span>
          )
        },
        enableSorting: false,
      },
      {
        accessorKey: "value_type",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.parameters.field.value_type")}
          />
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs font-normal">
            {t(`platform.parameters.value_type.${row.original.value_type}`)}
          </Badge>
        ),
      },
      {
        accessorKey: "scope_type",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.parameters.field.scope")}
          />
        ),
        cell: ({ row }) => {
          const param = row.original
          const scopeLabel = t(
            `platform.parameters.scope_type.${param.scope_type}`
          )
          const scopeDetail =
            param.scope_id && param.scope_type === "org"
              ? orgs.find((org) => org.id === param.scope_id)?.name ||
                param.scope_id
              : param.scope_id
          return (
            <Badge variant="secondary" className="text-xs font-semibold">
              {scopeLabel}
              {scopeDetail ? ` (${scopeDetail})` : ""}
            </Badge>
          )
        },
      },
      {
        accessorKey: "description",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.parameters.field.description")}
          />
        ),
        cell: ({ row }) => (
          <span className="max-w-sm truncate text-xs text-muted-foreground">
            {row.original.description || "-"}
          </span>
        ),
        enableSorting: false,
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
    [t, orgs, revealedSecrets]
  )

  const { table, total } = useClientListTable({
    columns,
    items: params,
    filterBy: {
      key: (item, value) =>
        matchTextColumnFilter(value, item.key, item.description),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        key: (a, b) => a.key.localeCompare(b.key),
        value_type: (a, b) => a.value_type.localeCompare(b.value_type),
        scope_type: (a, b) => a.scope_type.localeCompare(b.scope_type),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const dialogs = (
    <>
      <ParameterFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingParam={editingParam}
        orgs={orgs}
        onSuccess={loadParameters}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("platform.parameters.delete.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("platform.parameters.delete.description", {
                key: deleteTarget?.key ?? "",
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
              {t("platform.parameters.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  return (
    <ListPageShell
      title={t("platform.parameters.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {t("platform.parameters.count", { count: total })}
        </Badge>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={loadParameters}
      loadErrorTitle={t("platform.parameters.load_failed")}
      fetching={refreshing}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={openCreate}
          createLabel={t("platform.parameters.create")}
        />
      }
      dialogs={dialogs}
    />
  )
}
