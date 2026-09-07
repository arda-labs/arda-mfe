import { useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import type { Area, GeoAdminUnit, LookupValue } from "../api"
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
  selectFilterMeta,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { areasListDefinition } from "./list-query"
import { AreaFormDialog } from "./components/AreaFormDialog"

export function AreasPage() {
  const { t, formatDate } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Area | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Area | null>(null)
  const [areaTypes, setAreaTypes] = useState<LookupValue[]>([])
  const [adminUnits, setAdminUnits] = useState<GeoAdminUnit[]>([])
  const [lookupsLoading, setLookupsLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  // Small static lookups (<500 rows) stay client tier per the catalog skill.
  useEffect(() => {
    let cancelled = false
    Promise.all([
      platformApi.listLookupValues("AREA_TYPE"),
      platformApi.listGeoAdminUnits(undefined, 1),
    ])
      .then(([areaTypesResult, provinces]) => {
        if (cancelled) return
        setAreaTypes(areaTypesResult)
        setAdminUnits(provinces)
      })
      .catch(() => {
        // Non-critical lookups; table still lists areas without them.
      })
      .finally(() => {
        if (!cancelled) setLookupsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const getAreaTypeLabel = (code: string) =>
    areaTypes.find((item) => item.code === code)?.name || code

  const getAdminUnitLabel = (code?: string) =>
    adminUnits.find((item) => item.code === code)?.name || code || "-"

  const columns = useMemo<ColumnDef<Area>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.areas.field.code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("platform.areas.field.code"),
          t("platform.areas.placeholder.search")
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
            label={t("platform.areas.field.name")}
          />
        ),
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.description || "-"}
            </div>
          </div>
        ),
      },
      {
        id: "area_type_code",
        accessorKey: "area_type_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.areas.field.area_type")}
          />
        ),
        enableColumnFilter: true,
        meta: selectFilterMeta(
          t("platform.areas.field.area_type"),
          areaTypes.map((item) => ({ label: item.name, value: item.code }))
        ),
        cell: ({ row }) => getAreaTypeLabel(row.original.area_type_code),
      },
      {
        id: "parent",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.areas.field.parent")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.parent_id || "-"}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: "admin_unit",
        header: () => (
          <span className="text-xs font-semibold text-foreground/80">
            {t("platform.areas.field.admin_unit")}
          </span>
        ),
        cell: ({ row }) => getAdminUnitLabel(row.original.admin_unit_code),
        enableSorting: false,
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.areas.field.created_at")}
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
            label={t("platform.areas.field.status")}
          />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(t("platform.areas.field.status"), [
          { label: t("platform.areas.status.active"), value: "active" },
          { label: t("platform.areas.status.inactive"), value: "inactive" },
        ]),
        cell: ({ row }) => (
          <Status
            variant={row.original.status === "active" ? "success" : "default"}
          >
            <StatusIndicator />
            <StatusLabel>
              {row.original.status === "active"
                ? t("platform.areas.status.active")
                : t("platform.areas.status.inactive")}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formatDate, t, areaTypes, adminUnits]
  )

  /**
   * Server-driven list controller: URL page/perPage + `code`→q +
   * `area_type_code`/`status` filters <-> TanStack Query cache, cancellation,
   * dedupe and previous-page placeholder handled by @workspace/list-page.
   */
  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
  } = useServerDataTable<Area>({
    ...areasListDefinition,
    columns,
    queryFn: async (listQuery, { signal }) =>
      platformApi.listAreasPaged(
        {
          page: listQuery.page,
          perPage: listQuery.perPage,
          q: listQuery.q === undefined ? undefined : String(listQuery.q),
          status:
            listQuery.status === undefined
              ? undefined
              : String(listQuery.status),
          areaTypeCode:
            listQuery.area_type_code === undefined
              ? undefined
              : String(listQuery.area_type_code),
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
      await platformApi.deleteArea(deleteTarget.id)
      notify.success(t("platform.areas.toast.delete_success"))
      setDeleteTarget(null)
      await refetch()
    } catch (err) {
      notify.error(
        t("platform.areas.toast.delete_failed"),
        translateApiError(err)
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <ListPageShell
      title={t("platform.areas.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {t("platform.areas.count", { count: total })}
        </Badge>
      }
      criticalPending={isLoading || lookupsLoading}
      criticalError={loadError}
      onRetry={() => void refetch()}
      loadErrorTitle={t("platform.areas.load_failed")}
      fetching={isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => {
            setEditingItem(null)
            setDialogOpen(true)
          }}
          createLabel={t("platform.areas.create")}
        />
      }
      dialogs={
        <>
          <AreaFormDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            editingItem={editingItem}
            areaTypes={areaTypes}
            adminUnits={adminUnits}
            onSaved={() => refetch()}
          />

          <AlertDialog
            open={!!deleteTarget}
            onOpenChange={() => setDeleteTarget(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("platform.areas.delete.title")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("platform.areas.delete.description", {
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
                  {t("platform.areas.delete.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      }
    />
  )
}
