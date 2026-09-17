import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import {
  matchSelectFilter,
  matchTextColumnFilter,
  multiSelectFilterMeta,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import {
  sortByColumn,
  useClientListTable,
} from "@workspace/list-page/client-list"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { Badge } from "@workspace/ui/components/badge"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { listPolicyRoutes, type PolicyRoute } from "./api"

const DEFAULT_PAGE_SIZE = 10

/**
 * Route-policy browser (resource-management, W6a) — read-only.
 * `GET /api/admin/policy-routes` is unpaged (the complete policy.yaml, ~80
 * entries), so this is a client tier list: filter/sort/paginate in memory
 * behind the shared DataTable + ListPageShell, URL-synced via useClientListTable.
 */
export function ResourceRoutesPage() {
  const { t } = useI18n()

  const policyQuery = useQuery({
    queryKey: ["iam", "policy-routes", "list"],
    queryFn: listPolicyRoutes,
  })
  const items = useMemo(() => policyQuery.data?.items ?? [], [policyQuery.data])

  const columns = useMemo<ColumnDef<PolicyRoute>[]>(
    () => [
      {
        id: "id",
        accessorKey: "id",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.resource_routes.col.id")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("admin.resource_routes.col.id"),
          t("admin.resource_routes.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {row.original.id}
          </span>
        ),
      },
      {
        id: "path",
        accessorKey: "path",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.resource_routes.col.path")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.path}</span>
        ),
      },
      {
        id: "methods",
        accessorKey: "methods",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.resource_routes.col.methods")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {(row.original.methods ?? []).join(", ") ||
              t("admin.resource_routes.all_methods")}
          </span>
        ),
      },
      {
        id: "auth",
        accessorKey: "auth",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.resource_routes.col.auth")}
          />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(t("admin.resource_routes.col.auth"), [
          { label: t("admin.resource_routes.auth_required"), value: "true" },
          { label: t("admin.resource_routes.public"), value: "false" },
        ]),
        cell: ({ row }) => (
          <Badge variant={row.original.auth ? "default" : "outline"}>
            {row.original.auth
              ? t("admin.resource_routes.auth_required")
              : t("admin.resource_routes.public")}
          </Badge>
        ),
      },
      {
        id: "risk",
        accessorKey: "risk",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.resource_routes.col.risk")}
          />
        ),
        cell: ({ row }) => row.original.risk ?? "—",
      },
      {
        id: "permissions",
        accessorKey: "permissions",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.resource_routes.col.permissions")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {(row.original.permissions ?? []).join(", ") || "—"}
          </span>
        ),
      },
    ],
    [t]
  )

  const { table, total } = useClientListTable<PolicyRoute>({
    columns,
    items,
    filterBy: {
      id: (item, value) =>
        matchTextColumnFilter(
          value,
          item.id,
          item.path,
          (item.permissions ?? []).join(" ")
        ),
      auth: (item, value) => matchSelectFilter(String(item.auth), value),
    },
    sort: (rows, sorting) =>
      sortByColumn(rows, sorting, {
        id: (a, b) => a.id.localeCompare(b.id),
        path: (a, b) => a.path.localeCompare(b.path),
        methods: (a, b) =>
          (a.methods ?? []).join(",").localeCompare((b.methods ?? []).join(",")),
        auth: (a, b) => Number(a.auth) - Number(b.auth),
        risk: (a, b) => (a.risk ?? "").localeCompare(b.risk ?? ""),
        permissions: (a, b) =>
          (a.permissions ?? [])
            .join(",")
            .localeCompare((b.permissions ?? []).join(",")),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <ListPageShell
      title={t("admin.resource_routes.title")}
      header={
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("admin.resource_routes.description")}
        </p>
      }
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("admin.resource_routes.count", { count: total })}
        </Badge>
      }
      criticalPending={policyQuery.isPending}
      criticalError={policyQuery.error}
      onRetry={() => void policyQuery.refetch()}
      loadErrorTitle={t("admin.resource_routes.load_failed")}
      fetching={policyQuery.isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          exportFilename={t("admin.resource_routes.title")}
          sheetName={t("admin.resource_routes.title")}
          totalRowsCount={total}
        />
      }
    />
  )
}
