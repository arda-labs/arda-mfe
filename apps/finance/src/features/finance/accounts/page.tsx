import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { accountsApi, type Account } from "@/features/finance/api"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { StatusBadge } from "@workspace/ui/components/status-badge"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { useTreeTable } from "@workspace/list-page/use-tree-table"
import { textMatches } from "@workspace/list-page/tree"
import { TreeCell } from "@workspace/ui/components/data-table/tree-cell"
import { Button } from "@workspace/ui/components/button"
import { useQuery } from "@tanstack/react-query"
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react"
import { textSearchMeta } from "@workspace/list-page/column-filters"
import { createActionsColumn } from "@workspace/list-page/table-columns"
import { useState } from "react"
import { CreateAccountDialog } from "./components/CreateAccountDialog"

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  ASSET: "bg-info/10 text-info",
  LIABILITY: "bg-warning/10 text-warning-ink",
  EQUITY: "bg-muted text-foreground",
  INCOME: "bg-success/10 text-success",
  EXPENSE: "bg-destructive/10 text-destructive",
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

const accountId = (account: Account) => account.id
const accountParentId = (account: Account) => account.parentId
const byCode = (a: Account, b: Account) => a.code.localeCompare(b.code, "en", { numeric: true })

export function AccountsPage() {
  const { t, formatDate } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)

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
        // Toolbar search: account code or name, ignoring case and accents.
        filterFn: (row, _columnId, value) =>
          textMatches(value, row.original.code, row.original.name),
        cell: ({ row }) => (
          <TreeCell row={row}>
            <span className="font-mono text-sm">{row.original.code}</span>
          </TreeCell>
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
          <StatusBadge tone={row.original.isActive ? "success" : "neutral"}>{row.original.isActive
                ? t("common.status.active")
                : t("common.status.inactive")}</StatusBadge>
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
      createActionsColumn<Account>({
        onEdit: (row) => {
          setEditing(row)
          setDialogOpen(true)
        },
        editTitle: t("common.action.edit"),
        headerLabel: t("common.field.action"),
      }),
    ],
    [formatDate, t]
  )

  /**
   * The chart of accounts as a tree (design board 09, TreeTable): parent
   * accounts fold their sub-accounts, search keeps the branch of each match.
   * The whole chart is read page by page (BE caps per_page at 100).
   * Create/edit go through CreateAccountDialog; the account code is immutable.
   */
  const accounts = useQuery({
    queryKey: ["finance", "accounts", "tree"],
    queryFn: () => accountsApi.listAllAccounts(),
    staleTime: 60_000,
  })
  const { table, total, expandAll, collapseAll } = useTreeTable<Account>({
    items: accounts.data ?? [],
    columns,
    getId: accountId,
    getParentId: accountParentId,
    compare: byCode,
  })
  const refetch = accounts.refetch

  return (
    <ListPageShell
      title={t("finance.accounts.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {t("finance.accounts.count", { count: total })}
        </Badge>
      }
      criticalPending={accounts.isLoading}
      criticalError={accounts.error}
      onRetry={() => void refetch()}
      loadErrorTitle={t("finance.accounts.load_failed")}
      fetching={accounts.isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
          createLabel={t("finance.accounts.create")}
          exportFilename={t("finance.accounts.title")}
          sheetName={t("finance.accounts.title")}
          totalRowsCount={total}
        >
          <Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={expandAll}>
            <ChevronsUpDown className="size-3.5" />
            {t("common.tree.expand_all")}
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={collapseAll}>
            <ChevronsDownUp className="size-3.5" />
            {t("common.tree.collapse_all")}
          </Button>
        </ListTableToolbar>
      }
      dialogs={
        <CreateAccountDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) setEditing(null)
          }}
          editing={editing}
          onCreated={async () => {
            await refetch()
          }}
        />
      }
    />
  )
}
