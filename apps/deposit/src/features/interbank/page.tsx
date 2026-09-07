import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { matchTextColumnFilter, textSearchMeta } from "@workspace/list-page/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/list-page/client-list"
import { formatDateShort, formatAmount, formatRatePercent, fromMinor } from "@workspace/format"
import { depositApi, type InterbankDeposit } from "../api"

const DEFAULT_PAGE_SIZE = 10

/**
 * Interbank deposits (IBM): contracts with partner credit institutions.
 * Client tier — contract volume is expected to stay well under the 500-row
 * threshold (BE caps the unpaged list at 200 rows).
 */
export function InterbankPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const [items, setItems] = useState<InterbankDeposit[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      const result = await depositApi.listInterbank()
      setItems(result.items)
    } catch (reason) {
      setLoadError(reason)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load(true)
  }, [load])

  const columns = useMemo<ColumnDef<InterbankDeposit>[]>(
    () => [
      {
        id: "deposit_code",
        accessorKey: "deposit_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.interbank.field.deposit_code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("deposit.interbank.field.deposit_code"),
          t("deposit.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.deposit_code}</span>
        ),
      },
      {
        id: "counterparty_code",
        accessorKey: "counterparty_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.interbank.field.counterparty")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("deposit.interbank.field.counterparty"),
          t("deposit.placeholder.search")
        ),
      },
      {
        id: "principal_minor",
        accessorKey: "principal_minor",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.interbank.field.principal")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {formatAmount(fromMinor(row.original.principal_minor, row.original.currency_code), row.original.currency_code)}
          </span>
        ),
      },
      {
        id: "interest_rate",
        accessorKey: "interest_rate",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.interbank.field.interest_rate")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatRatePercent(row.original.interest_rate)}</span>
        ),
      },
      {
        id: "deposit_date",
        accessorKey: "deposit_date",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.interbank.field.deposit_date")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDateShort(row.original.deposit_date)}</span>
        ),
      },
      {
        id: "maturity_date",
        accessorKey: "maturity_date",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.interbank.field.maturity_date")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDateShort(row.original.maturity_date)}</span>
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
          <Badge variant={row.original.status === "ACTIVE" ? "default" : "outline"}>
            {row.original.status}
          </Badge>
        ),
      },
    ],
    [t]
  )

  const { table, total } = useClientListTable({
    columns,
    items,
    filterBy: {
      deposit_code: (item, value) => matchTextColumnFilter(value, item.deposit_code),
      counterparty_code: (item, value) => matchTextColumnFilter(value, item.counterparty_code),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        deposit_code: (a, b) => a.deposit_code.localeCompare(b.deposit_code),
        counterparty_code: (a, b) => a.counterparty_code.localeCompare(b.counterparty_code),
        deposit_date: (a, b) => a.deposit_date.localeCompare(b.deposit_date),
        maturity_date: (a, b) => a.maturity_date.localeCompare(b.maturity_date),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <ListPageShell
      title={t("deposit.interbank.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("deposit.count", { count: total })}
        </Badge>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={() => void load(true)}
      fetching={refreshing}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          exportFilename={t("deposit.interbank.title")}
          sheetName={t("deposit.interbank.title")}
          totalRowsCount={total}
        />
      }
    />
  )
}
