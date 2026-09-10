import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { matchTextColumnFilter, textSearchMeta } from "@workspace/list-page/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/list-page/client-list"
import { formatDateShort, formatRatePercent } from "@workspace/format"
import { depositApi, type InterestRate } from "../api"
import { RateDialog } from "./components/RateDialog"

/** DPM rate tiers (DPM.100/101) — register/adjust goes through approval. */
export function RatesPage() {
  const { t } = useI18n()
  const [items, setItems] = useState<InterestRate[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      const result = await depositApi.listInterestRates()
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

  const columns = useMemo<ColumnDef<InterestRate>[]>(
    () => [
      {
        id: "product_code",
        accessorKey: "product_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("deposit.rates.field.product")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("deposit.rates.field.product"), t("deposit.placeholder.search")),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.product_code || t("deposit.rates.default_label")}
          </span>
        ),
      },
      {
        id: "term_months",
        accessorKey: "term_months",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("deposit.products.field.term_months")} />
        ),
      },
      {
        id: "rate",
        accessorKey: "rate",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("deposit.products.field.interest_rate")} />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">{formatRatePercent(row.original.rate)}</span>
        ),
      },
      {
        id: "method",
        accessorKey: "method",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("deposit.rates.field.method")} />
        ),
      },
      {
        id: "denominator",
        accessorKey: "denominator",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("deposit.rates.field.denominator")} />
        ),
      },
      {
        id: "effective_from",
        accessorKey: "effective_from",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("deposit.rates.field.effective_from")} />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDateShort(row.original.effective_from)}</span>
        ),
      },
      {
        id: "is_active",
        accessorKey: "is_active",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.status")} />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "outline"}>
            {row.original.is_active ? t("deposit.status.active") : t("deposit.status.inactive")}
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
      product_code: (item, value) => matchTextColumnFilter(value, item.product_code ?? ""),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        effective_from: (a, b) => a.effective_from.localeCompare(b.effective_from),
        rate: (a, b) => a.rate - b.rate,
      }),
    defaultPageSize: 10,
  })

  return (
    <ListPageShell
      title={t("deposit.rates.title")}
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
          createLabel={t("deposit.rates.create")}
          exportFilename={t("deposit.rates.title")}
          sheetName={t("deposit.rates.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <RateDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={() => load()} />
      }
    />
  )
}
