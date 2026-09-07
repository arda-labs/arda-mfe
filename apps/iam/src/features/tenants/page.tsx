import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { tenantsApi } from "./api"
import { tenantsListDefinition } from "./list-query"
import type { Tenant } from "./types"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/admin-list/list-page-shell"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"
import { textSearchMeta } from "@workspace/admin-list/column-filters"
import { useServerDataTable } from "@workspace/admin-list/server-data-table"
import { CreateTenantDialog } from "./components/create-tenant-dialog"
import { TenantMembersDialog } from "./components/tenant-members-dialog"
import { Users } from "lucide-react"

export function TenantsPage() {
  const { t, formatDate } = useI18n()
  const [createOpen, setCreateOpen] = useState(false)
  const [memberTarget, setMemberTarget] = useState<Tenant | null>(null)

  const columns = useMemo<ColumnDef<Tenant>[]>(
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
        meta: textSearchMeta(
          t("common.field.code"),
          t("iam.tenants.search_placeholder")
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-mono text-sm">{row.original.code}</div>
            <div className="truncate font-mono text-xs text-muted-foreground">
              {row.original.id}
            </div>
          </div>
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
        cell: ({ row }) => (
          <Badge
            variant={row.original.status === "ACTIVE" ? "success" : "secondary"}
          >
            {row.original.status || "-"}
          </Badge>
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
        cell: ({ row }) =>
          row.original.createdAt ? formatDate(row.original.createdAt) : "-",
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right">{t("common.field.action")}</div>
        ),
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              onClick={() => setMemberTarget(row.original)}
              title={t("iam.tenants.action.members")}
            >
              <Users className="size-3.5" />
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
   * Server-driven list controller: URL page/perPage + `code`→q filters <->
   * TanStack Query cache, cancellation, dedupe and previous-page placeholder
   * handled by @workspace/admin-list. The page owns columns and dialogs only.
   */
  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
  } = useServerDataTable<Tenant>({
    ...tenantsListDefinition,
    columns,
    queryFn: async (query) =>
      tenantsApi.listTenants({
        page: query.page,
        perPage: query.perPage,
        q: query.q === undefined ? undefined : String(query.q),
        sort: query.sort,
        order: query.order,
      }),
  })

  return (
    <ListPageShell
      title={t("iam.tenants.title")}
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("iam.tenants.count", { count: total })}
        </Badge>
      }
      criticalPending={isLoading}
      criticalError={loadError}
      onRetry={() => void refetch()}
      fetching={isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setCreateOpen(true)}
          createLabel={t("iam.tenants.create")}
          exportFilename={t("iam.tenants.title")}
          sheetName={t("iam.tenants.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <>
          <CreateTenantDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={() => void refetch()}
          />
          <TenantMembersDialog
            tenant={memberTarget}
            open={memberTarget !== null}
            onOpenChange={(nextOpen) => !nextOpen && setMemberTarget(null)}
            onChanged={() => void refetch()}
          />
        </>
      }
    />
  )
}
