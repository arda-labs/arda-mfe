import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useSearchParams } from "react-router-dom"
import { translateApiError, useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { PageHeader } from "@workspace/ui/components/page-header"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import {
  matchSelectFilter,
  matchTextColumnFilter,
  multiSelectFilterMeta,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/list-page/client-list"
import { formatAmount, formatDateShort, fromMinor } from "@workspace/format"
import { cashPosition, listCash, type CashPositionRow, type CashTxn } from "../api"
import { RecordCashForm } from "./components/record-cash-form"
import { CashPositionTable } from "./components/position-table"
import { exportCashPositionCsv } from "./components/position-csv"

type TabKey = "transactions" | "position"

const TABS: TabKey[] = ["transactions", "position"]

const DEFAULT_PAGE_SIZE = 20

/**
 * VCM cash book (sổ quỹ tiền mặt, W7): transactions + daily position.
 *
 * GET /api/finance/cash is unpaged (BE answers with WriteEnvelopeUnpaged over
 * a hard SQL LIMIT 500 — see arda-be/apps/finance-service
 * internal/handler/cash_handler.go ListCash and internal/service/cash_service.go
 * List), so the transactions tab is a client-tier list over the complete
 * response; filters (`date`, `direction`), sort and paging stay real and
 * URL-synced via useClientListTable. The position report is a plain table.
 */
export function CashPage() {
  const { t } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const [transactions, setTransactions] = useState<CashTxn[]>([])
  const [position, setPosition] = useState<CashPositionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [txns, pos] = await Promise.all([listCash(), cashPosition()])
      setTransactions(txns.items)
      setPosition(pos)
    } catch (error) {
      setLoadError(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const columns = useMemo<ColumnDef<CashTxn>[]>(
    () => [
      {
        id: "date",
        accessorKey: "txn_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("finance.cash.field.date")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("finance.cash.field.date"),
          t("finance.cash.placeholder.date")
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {formatDateShort(row.original.txn_date)}
          </span>
        ),
      },
      {
        id: "direction",
        accessorKey: "direction",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.cash.field.direction")}
          />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(t("finance.cash.field.direction"), [
          { label: t("finance.cash.direction.IN"), value: "IN" },
          { label: t("finance.cash.direction.OUT"), value: "OUT" },
        ]),
        cell: ({ row }) => (
          <Badge variant={row.original.direction === "IN" ? "default" : "outline"}>
            {t(`finance.cash.direction.${row.original.direction}`)}
          </Badge>
        ),
      },
      {
        id: "amount",
        accessorKey: "amount_minor",
        header: ({ column }) => (
          <div className="flex justify-end">
            <DataTableColumnHeader
              column={column}
              label={t("finance.cash.field.amount")}
            />
          </div>
        ),
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">
            {formatAmount(
              fromMinor(row.original.amount_minor, row.original.currency_code),
              row.original.currency_code
            )}
          </span>
        ),
      },
      {
        id: "description",
        accessorKey: "description",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.cash.field.description")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        id: "journal",
        accessorKey: "journal_entry_id",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.field.journal")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.journal_entry_id
              ? row.original.journal_entry_id.slice(0, 8)
              : "—"}
          </span>
        ),
      },
    ],
    [t]
  )

  const { table, total } = useClientListTable<CashTxn>({
    columns,
    items: transactions,
    filterBy: {
      date: (item, value) => matchTextColumnFilter(value, item.txn_date),
      direction: (item, value) => matchSelectFilter(item.direction, value),
    },
    sort: (rows, sorting) =>
      sortByColumn(rows, sorting, {
        date: (a, b) => a.txn_date.localeCompare(b.txn_date),
        direction: (a, b) => a.direction.localeCompare(b.direction),
        amount: (a, b) => a.amount_minor - b.amount_minor,
        description: (a, b) =>
          (a.description ?? "").localeCompare(b.description ?? ""),
        journal: (a, b) =>
          (a.journal_entry_id ?? "").localeCompare(b.journal_entry_id ?? ""),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const tab: TabKey =
    searchParams.get("tab") === "position" ? "position" : "transactions"

  const selectTab = (next: TabKey) => {
    const params = new URLSearchParams(searchParams)
    params.set("tab", next)
    params.set("page", "1")
    setSearchParams(params, { replace: true })
  }

  if (tab === "position") {
    return (
      <section className="flex h-full min-h-0 flex-col gap-5 overflow-hidden p-4 sm:p-5">
        <PageHeader
          title={t("finance.cash.title")}
          actions={
            <Button
              variant="outline"
              onClick={() => exportCashPositionCsv(position)}
              disabled={loading || position.length === 0}
            >
              {t("finance.cash.export_csv")}
            </Button>
          }
        />
        <div className="flex flex-col gap-3">
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t("finance.cash.description")}
          </p>
          <CashTabs tab={tab} onSelect={selectTab} />
        </div>
        {loadError ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            {translateApiError(loadError, t("finance.cash.load_failed"))}
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card">
          <CashPositionTable rows={position} loading={loading} />
        </div>
      </section>
    )
  }

  return (
    <ListPageShell
      title={t("finance.cash.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {t("finance.cash.count", { count: total })}
        </Badge>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={() => void load()}
      loadErrorTitle={t("finance.cash.load_failed")}
      table={table}
      header={
        <div className="flex flex-col gap-3">
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t("finance.cash.description")}
          </p>
          <CashTabs tab={tab} onSelect={selectTab} />
          <RecordCashForm onRecorded={load} />
        </div>
      }
      toolbar={
        <ListTableToolbar
          table={table}
          exportFilename={t("finance.cash.title")}
          sheetName={t("finance.cash.title")}
          totalRowsCount={total}
        />
      }
    />
  )
}

function CashTabs({
  tab,
  onSelect,
}: {
  tab: TabKey
  onSelect: (next: TabKey) => void
}) {
  const { t } = useI18n()
  return (
    <div className="flex flex-wrap items-center gap-2">
      {TABS.map((value) => (
        <Button
          key={value}
          type="button"
          size="sm"
          variant={value === tab ? "default" : "outline"}
          className="h-8 px-3 text-xs font-semibold"
          onClick={() => onSelect(value)}
        >
          {t(`finance.cash.tab.${value}`)}
        </Button>
      ))}
    </div>
  )
}
