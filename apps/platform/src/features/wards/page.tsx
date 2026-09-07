import { useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import type { GeoAdminUnit } from "../api"
import { platformApi } from "../api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { Edit2 } from "lucide-react"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { textSearchMeta, selectFilterMeta } from "@workspace/list-page/column-filters"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { wardsListDefinition } from "./list-query"
import { WardFormDialog } from "./components/WardFormDialog"

export function WardsPage() {
  const { t, formatDate } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<GeoAdminUnit | null>(null)
  const [provinces, setProvinces] = useState<GeoAdminUnit[]>([])
  const [provincesLoading, setProvincesLoading] = useState(true)

  // Lookup provinces (level 1, ~63 rows) for the parent filter/select — small,
  // static, client tier per the catalog skill; the ~10k wards table is server tier.
  useEffect(() => {
    let cancelled = false
    platformApi
      .listGeoAdminUnits(undefined, 1)
      .then((result) => {
        if (!cancelled) setProvinces(result)
      })
      .catch(() => {
        // Non-critical lookup; the page still lists wards without it.
      })
      .finally(() => {
        if (!cancelled) setProvincesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const provinceNameByCode = useMemo(
    () =>
      Object.fromEntries(
        provinces.map((province) => [province.code, province.name])
      ),
    [provinces]
  )

  const columns = useMemo<ColumnDef<GeoAdminUnit>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.wards.field.code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("platform.wards.field.code"),
          t("platform.wards.placeholder.search")
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
            label={t("platform.wards.field.name")}
          />
        ),
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium">{row.original.name}</div>
            {row.original.full_name ? (
              <div className="text-xs text-muted-foreground">
                {row.original.full_name}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: "parent_code",
        accessorKey: "parent_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.wards.field.parent")}
          />
        ),
        enableColumnFilter: true,
        meta: selectFilterMeta(
          t("platform.wards.field.parent"),
          provinces.map((province) => ({
            label: province.name,
            value: province.code,
          }))
        ),
        cell: ({ row }) =>
          provinceNameByCode[row.original.parent_code ?? ""] ||
          row.original.parent_code ||
          "-",
      },
      {
        accessorKey: "unit_type",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.wards.field.unit_type")}
          />
        ),
      },
      {
        accessorKey: "country_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.wards.field.country_code")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.country_code}</span>
        ),
      },
      {
        accessorKey: "region_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.wards.field.region_code")}
          />
        ),
        cell: ({ row }) => row.original.region_code || "-",
      },
      {
        accessorKey: "effective_from",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.wards.field.effective_from")}
          />
        ),
        cell: ({ row }) => row.original.effective_from || "-",
      },
      {
        accessorKey: "effective_to",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.wards.field.effective_to")}
          />
        ),
        cell: ({ row }) => row.original.effective_to || "-",
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.wards.field.created_at")}
          />
        ),
        cell: ({ row }) => formatDate(row.original.created_at ?? ""),
      },
      {
        id: "is_active",
        accessorKey: "is_active",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.wards.field.status")}
          />
        ),
        cell: ({ row }) => (
          <Status variant={row.original.is_active ? "success" : "default"}>
            <StatusIndicator />
            <StatusLabel>
              {row.original.is_active
                ? t("platform.wards.status.active")
                : t("platform.wards.status.inactive")}
            </StatusLabel>
          </Status>
        ),
      },
      {
        id: "actions",
        header: () => (
          <span className="sr-only">{t("platform.wards.field.actions")}</span>
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
          </div>
        ),
        enableSorting: false,
      },
    ],
    [formatDate, provinceNameByCode, provinces, t]
  )

  /**
   * Server-driven list controller: URL page/perPage + `code`→q + `parent_code`
   * filters <-> TanStack Query cache, cancellation, dedupe and previous-page
   * placeholder handled by @workspace/list-page. The page owns columns and
   * the create/edit dialog only.
   */
  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
    query,
  } = useServerDataTable<GeoAdminUnit>({
    ...wardsListDefinition,
    columns,
    queryFn: async (listQuery, { signal }) =>
      platformApi.listGeoAdminUnitsPaged(
        {
          page: listQuery.page,
          perPage: listQuery.perPage,
          q: listQuery.q === undefined ? undefined : String(listQuery.q),
          parentCode:
            listQuery.parentCode === undefined
              ? undefined
              : String(listQuery.parentCode),
          level: 2,
          sort: listQuery.sort,
          order: listQuery.order,
        },
        { signal }
      ),
  })

  return (
    <ListPageShell
      title={t("platform.wards.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {t("platform.wards.count", { count: total })}
        </Badge>
      }
      criticalPending={isLoading || provincesLoading}
      criticalError={loadError}
      onRetry={() => void refetch()}
      loadErrorTitle={t("platform.wards.load_failed")}
      fetching={isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => {
            setEditingItem(null)
            setDialogOpen(true)
          }}
          createLabel={t("platform.wards.create")}
        />
      }
      dialogs={
        <WardFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingItem={editingItem}
          provinces={provinces}
          defaultParentCode={
            query.parentCode === undefined
              ? undefined
              : String(query.parentCode)
          }
          onSaved={() => refetch()}
        />
      }
    />
  )
}
