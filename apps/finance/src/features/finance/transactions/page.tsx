import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@workspace/ui/components/badge"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { useI18n } from "@workspace/i18n"
import { defineServerList } from "@workspace/admin-list/server-list"
import { useServerDataTable } from "@workspace/admin-list/server-data-table"
import { ListPageShell } from "@workspace/admin-list/list-page-shell"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"
import { type Transaction, financeApi } from "@/features/finance/api"
import { PostTransactionDialog } from "./components/post-transaction-dialog"

const STATUS_VARIANTS: Partial<
  Record<string, "default" | "success" | "error" | "warning" | "info">
> = {
  POSTED: "success",
  PENDING: "warning",
  REVERSED: "default",
  FAILED: "error",
}

const DEFAULT_PAGE_SIZE = 10

/** URL-synced pagination contract shared by the table toolbar and search. */
export const transactionsListDefinition = defineServerList({
  queryKey: ["finance", "transactions", "list"] as const,
  queryConfig: { defaultPageSize: DEFAULT_PAGE_SIZE },
})

export function TransactionsPage() {
  const { t } = useI18n()
  const [createOpen, setCreateOpen] = useState(false)

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        id: "id",
        accessorKey: "id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="ID" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.id.slice(0, 8)}…
          </span>
        ),
        enableSorting: false,
      },
      {
        id: "txnType",
        accessorKey: "txnType",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.type")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.txnType}</span>
        ),
        enableSorting: false,
      },
      {
        id: "postedAt",
        accessorKey: "postedAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.date")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(row.original.postedAt).toLocaleDateString()}
          </span>
        ),
        enableSorting: false,
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
          <Status variant={STATUS_VARIANTS[row.original.status] || "default"}>
            <StatusIndicator />
            <StatusLabel>{row.original.status}</StatusLabel>
          </Status>
        ),
        enableSorting: false,
      },
      {
        id: "description",
        accessorKey: "description",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.description")}
          />
        ),
        cell: ({ row }) => (
          <span className="max-w-xs truncate text-muted-foreground">
            {row.original.description || "—"}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: "createdBy",
        accessorKey: "createdBy",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Created By" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.createdBy.slice(0, 8)}
          </span>
        ),
        enableSorting: false,
      },
    ],
    [t]
  )

  /**
   * Server-driven list controller: URL page/perPage <-> TanStack Query cache
   * with cancellation, request dedupe and previous-page placeholder handled by
   * @workspace/admin-list. Page owns columns and business actions only.
   */
  const {
    total,
    isLoading,
    isFetching,
    error: listError,
    refetch,
    table,
  } = useServerDataTable<Transaction>({
    ...transactionsListDefinition,
    columns,
    queryFn: async (query) =>
      financeApi.listTransactions({ page: query.page, perPage: query.perPage }),
  })

  return (
    <ListPageShell
      title={t("finance.transactions.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {total}
        </Badge>
      }
      criticalPending={isLoading}
      criticalError={listError ?? null}
      onRetry={() => void refetch()}
      fetching={isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setCreateOpen(true)}
          createLabel={t("common.action.create")}
          exportFilename={t("finance.transactions.title")}
          sheetName={t("finance.transactions.title")}
        />
      }
      dialogs={
        <PostTransactionDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onPosted={() => void refetch()}
        />
      }
    />
  )
}