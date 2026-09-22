import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { matchSelectFilter, matchTextColumnFilter, textSearchMeta } from "@workspace/list-page/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/list-page/client-list"
import { formatAmount, formatDateShort, formatRatePercent, fromMinor } from "@workspace/format"
import { depositApi, type InterbankBorrow } from "../api"
import { RaiseBorrowDialog } from "./components/RaiseBorrowDialog"

const DEFAULT_PAGE_SIZE = 10

/**
 * Interbank borrowing (tiền vay TCTD khác) — the mirror of the placement page.
 * Client tier: the BE list is capped at 200 rows, so no server paging yet.
 *
 * A row lands PENDING_APPROVAL and only becomes ACTIVE once a checker approves
 * it, so the status column carries the maker/checker state, not just life-cycle.
 */
export function InterbankBorrowPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const [items, setItems] = useState<InterbankBorrow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      const result = await depositApi.listBorrows()
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

  const columns = useMemo<ColumnDef<InterbankBorrow>[]>(
    () => [
      {
        id: "borrow_code",
        accessorKey: "borrow_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.borrow.field.borrow_code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("deposit.borrow.field.borrow_code"),
          t("deposit.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold">{row.original.borrow_code}</span>
        ),
      },
      {
        id: "counterparty_code",
        accessorKey: "counterparty_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.borrow.field.counterparty")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("deposit.borrow.field.counterparty"),
          t("deposit.placeholder.search")
        ),
      },
      {
        id: "lender_type",
        accessorKey: "lender_type",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.borrow.field.lender_type")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("deposit.borrow.field.lender_type"),
          t("deposit.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="text-xs">
            {t(`deposit.borrow.lender.${row.original.lender_type}`)}
          </span>
        ),
      },
      {
        id: "outstanding_minor",
        accessorKey: "outstanding_minor",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.borrow.field.outstanding")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {formatAmount(
              fromMinor(row.original.outstanding_minor, row.original.currency_code),
              row.original.currency_code
            )}
          </span>
        ),
      },
      {
        id: "interest_rate",
        accessorKey: "interest_rate",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.borrow.field.interest_rate")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatRatePercent(row.original.interest_rate)}</span>
        ),
      },
      {
        id: "drawdown_date",
        accessorKey: "drawdown_date",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.borrow.field.drawdown_date")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDateShort(row.original.drawdown_date)}</span>
        ),
      },
      {
        id: "maturity_date",
        accessorKey: "maturity_date",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.borrow.field.maturity_date")}
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
          <DataTableColumnHeader column={column} label={t("common.field.status")} />
        ),
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "ACTIVE"
                ? "default"
                : row.original.status === "PENDING_APPROVAL"
                  ? "secondary"
                  : "outline"
            }
          >
            {t(`deposit.borrow.status.${row.original.status}`)}
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
      borrow_code: (item, value) => matchTextColumnFilter(value, item.borrow_code),
      counterparty_code: (item, value) => matchTextColumnFilter(value, item.counterparty_code),
      lender_type: (item, value) => matchSelectFilter(item.lender_type, value),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        borrow_code: (a, b) => a.borrow_code.localeCompare(b.borrow_code),
        counterparty_code: (a, b) => a.counterparty_code.localeCompare(b.counterparty_code),
        lender_type: (a, b) => a.lender_type.localeCompare(b.lender_type),
        outstanding_minor: (a, b) => a.outstanding_minor - b.outstanding_minor,
        interest_rate: (a, b) => a.interest_rate - b.interest_rate,
        drawdown_date: (a, b) => a.drawdown_date.localeCompare(b.drawdown_date),
        maturity_date: (a, b) => a.maturity_date.localeCompare(b.maturity_date),
        status: (a, b) => a.status.localeCompare(b.status),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <ListPageShell
      title={t("deposit.borrow.title")}
      header={<p className="max-w-3xl text-sm text-muted-foreground">{t("deposit.borrow.description")}</p>}
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
          onCreate={() => setCreateOpen(true)}
          createLabel={t("deposit.borrow.create")}
          exportFilename={t("deposit.borrow.title")}
          sheetName={t("deposit.borrow.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <RaiseBorrowDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSaved={() => load()}
        />
      }
    />
  )
}
