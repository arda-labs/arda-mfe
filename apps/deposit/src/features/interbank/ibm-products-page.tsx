import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { matchTextColumnFilter, textSearchMeta } from "@workspace/list-page/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/list-page/client-list"
import { formatRatePercent } from "@workspace/format"
import { depositApi, type IbmProduct } from "../api"
import { IbmProductDialog } from "./components/IbmProductDialog"

/** IBM product catalog (sản phẩm tiền gửi liên ngân hàng). */
export function IbmProductsPage() {
  const { t } = useI18n()
  const [items, setItems] = useState<IbmProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<IbmProduct | null>(null)

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      const result = await depositApi.listIbmProducts(true)
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

  const columns = useMemo<ColumnDef<IbmProduct>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("common.field.code"), t("deposit.placeholder.search")),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">{row.original.code}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.name")} />
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "term_months",
        accessorKey: "term_months",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("deposit.products.field.term_months")} />
        ),
      },
      {
        id: "interest_rate",
        accessorKey: "interest_rate",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.products.field.interest_rate")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatRatePercent(row.original.interest_rate)}</span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">{t("common.field.action")}</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline"
              onClick={() => setEditTarget(row.original)}
            >
              {t("common.action.edit")}
            </button>
          </div>
        ),
      },
    ],
    [t]
  )

  const { table, total } = useClientListTable({
    columns,
    items,
    filterBy: {
      code: (item, value) => matchTextColumnFilter(value, item.code),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        code: (a, b) => a.code.localeCompare(b.code),
        name: (a, b) => a.name.localeCompare(b.name),
      }),
    defaultPageSize: 10,
  })

  return (
    <ListPageShell
      title={t("deposit.interbank.product.title")}
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
          createLabel={t("deposit.interbank.product.create")}
          exportFilename={t("deposit.interbank.product.title")}
          sheetName={t("deposit.interbank.product.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <>
          <IbmProductDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            product={null}
            onSaved={() => load()}
          />
          <IbmProductDialog
            open={editTarget !== null}
            onOpenChange={(next) => !next && setEditTarget(null)}
            product={editTarget}
            onSaved={() => load()}
          />
        </>
      }
    />
  )
}
