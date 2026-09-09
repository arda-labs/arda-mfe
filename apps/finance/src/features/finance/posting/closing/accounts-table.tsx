import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { DataTableSkeleton } from "@workspace/ui/components/data-table/data-table-skeleton"
import { formatAmount, fromMinor } from "@workspace/format"
import { sortByColumn, useClientListTable } from "@workspace/list-page/client-list"
import type { ClosingAccountRow } from "../../api"

const PURPOSE_LABEL_KEYS: Record<ClosingAccountRow["acc_purpose"], string> = {
  INC: "finance.posting.closing.purpose_income",
  EXP: "finance.posting.closing.purpose_expense",
}

function formatMinor(minor: number): string {
  return formatAmount(fromMinor(minor), "VND")
}

/**
 * Tab 2 of the closing screen (FAC.203.01) — READ-ONLY account table: EPAS
 * gives no selection and no editing (every returned row is closed at its
 * balance, closing_amount = balance per the BE). The screen owns the fetch
 * lifecycle; this grid only renders rows + the not-loaded / loading / empty
 * states.
 */
export function ClosingAccountsTable({
  rows,
  isLoading,
  loaded,
}: {
  rows: ClosingAccountRow[]
  isLoading: boolean
  loaded: boolean
}) {
  const { t } = useI18n()

  const columns = useMemo<ColumnDef<ClosingAccountRow>[]>(
    () => [
      {
        id: "acc_code",
        accessorKey: "acc_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("finance.posting.closing.col_code")} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.acc_code}</span>
        ),
      },
      {
        id: "acc_name",
        accessorKey: "acc_name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("finance.posting.closing.col_name")} />
        ),
      },
      {
        id: "acc_purpose",
        accessorKey: "acc_purpose",
        header: t("finance.posting.closing.col_purpose"),
        cell: ({ row }) => (
          <Badge variant="outline">{t(PURPOSE_LABEL_KEYS[row.original.acc_purpose])}</Badge>
        ),
      },
      {
        id: "acc_nature",
        accessorKey: "acc_nature",
        header: t("finance.posting.closing.col_nature"),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{row.original.acc_nature || "—"}</span>
        ),
      },
      {
        id: "balance_minor",
        accessorKey: "balance_minor",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.posting.closing.col_balance")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatMinor(row.original.balance_minor)}</span>
        ),
      },
      {
        id: "closing_amount_minor",
        accessorKey: "closing_amount_minor",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.posting.closing.col_closing_amount")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMinor(row.original.closing_amount_minor)}
          </span>
        ),
      },
    ],
    [t]
  )

  const table = useClientListTable({
    columns,
    items: rows,
    sort: (sorted, sorting) =>
      sortByColumn(sorted, sorting, {
        acc_code: (a, b) => a.acc_code.localeCompare(b.acc_code),
        acc_name: (a, b) => a.acc_name.localeCompare(b.acc_name),
        balance_minor: (a, b) => a.balance_minor - b.balance_minor,
        closing_amount_minor: (a, b) => a.closing_amount_minor - b.closing_amount_minor,
      }),
    defaultPageSize: 20,
  })

  if (!loaded && !isLoading) {
    return (
      <div className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">
        {t("finance.posting.closing.not_loaded")}
      </div>
    )
  }

  if (isLoading) {
    return <DataTableSkeleton columnCount={6} rowCount={4} />
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border px-4 py-6 text-center text-sm text-muted-foreground">
        {t("finance.posting.closing.empty")}
      </div>
    )
  }

  return <DataTable table={table.table} totalRows={table.total} className="min-h-0" />
}
