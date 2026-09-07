import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { financeApi, type Account } from "@/features/finance/api"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { textSearchMeta } from "@workspace/list-page/column-filters"
import { useState } from "react"
import { accountsListDefinition } from "./list-query"
import { CreateAccountDialog } from "./components/CreateAccountDialog"

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  ASSET: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  LIABILITY:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  EQUITY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  INCOME:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  EXPENSE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

function accountTypeLabel(type: string, t: ReturnType<typeof useI18n>["t"]) {
  const keys: Record<string, Parameters<typeof t>[0]> = {
    ASSET: "finance.account_type.asset",
    LIABILITY: "finance.account_type.liability",
    EQUITY: "finance.account_type.equity",
    INCOME: "finance.account_type.income",
    EXPENSE: "finance.account_type.expense",
  }
  return keys[type] ? t(keys[type]) : type
}

export function AccountsPage() {
  const { t, formatDate } = useI18n()
  const [createOpen, setCreateOpen] = useState(false)

  const columns = useMemo<ColumnDef<Account>[]>(
    () => [
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
          t("finance.accounts.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.code}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.name")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        id: "type",
        accessorKey: "type",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.type")}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ACCOUNT_TYPE_COLORS[row.original.type] || ""}`}
          >
            {accountTypeLabel(row.original.type, t)}
          </span>
        ),
      },
      {
        id: "normalBalance",
        accessorKey: "normalBalance",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.accounts.field.normal_balance")}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.normalBalance === "DEBIT"
              ? t("finance.entry.debit")
              : t("finance.entry.credit")}
          </span>
        ),
      },
      {
        id: "currency",
        accessorKey: "currency",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.currency")}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.currency}</span>
        ),
      },
      {
        id: "isActive",
        accessorKey: "isActive",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.status")}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <Status variant={row.original.isActive ? "success" : "default"}>
            <StatusIndicator />
            <StatusLabel>
              {row.original.isActive
                ? t("common.status.active")
                : t("common.status.inactive")}
            </StatusLabel>
          </Status>
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
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [formatDate, t]
  )

  /**
   * Server-driven list controller: URL page/perPage + `code`→q filter and
   * whitelisted sort <-> TanStack Query cache. The BE adapter returns the
   * standard ListResponse shape over the `{ accounts, total }` envelope.
   * Update/delete do not exist on the accounts BE — the dialog is
   * create-only.
   */
  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
  } = useServerDataTable<Account>({
    ...accountsListDefinition,
    columns,
    queryFn: async (query) =>
      financeApi.listAccountsPaged({
        page: query.page,
        perPage: query.perPage,
        q: query.q === undefined ? undefined : String(query.q),
        sort: query.sort,
        order: query.order,
      }),
  })

  return (
    <ListPageShell
      title={t("finance.accounts.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {t("finance.accounts.count", { count: total })}
        </Badge>
      }
      criticalPending={isLoading}
      criticalError={loadError}
      onRetry={() => void refetch()}
      loadErrorTitle={t("finance.accounts.load_failed")}
      fetching={isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setCreateOpen(true)}
          createLabel={t("finance.accounts.create")}
          exportFilename={t("finance.accounts.title")}
          sheetName={t("finance.accounts.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <CreateAccountDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={async () => {
            await refetch()
          }}
        />
      }
    />
  )
}
