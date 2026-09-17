import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import {
  matchTextColumnFilter,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import {
  sortByColumn,
  useClientListTable,
} from "@workspace/list-page/client-list"
import { useServerList } from "@workspace/list-page/server-list"
import { formatRatePercent } from "@workspace/format"
import { capitalApi, type CapitalProduct } from "../../api"
import { ProductDialog } from "./components/ProductDialog"

const DEFAULT_PAGE_SIZE = 10

/**
 * CFM fund-product catalog (sản phẩm vốn). `GET /api/capital/products` returns
 * the complete set (no page/per_page), so this is a client tier list: one query
 * for all rows, then filter/sort/paginate in memory.
 */
export function ProductsPage() {
  const { t } = useI18n()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CapitalProduct | null>(null)

  const columns = useMemo<ColumnDef<CapitalProduct>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("common.field.code"), t("capital.placeholder.search")),
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
        id: "fund_type_code",
        accessorKey: "fund_type_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("capital.contracts.field.fund_type")}
          />
        ),
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.fund_type_code}</span>,
      },
      {
        id: "term_months",
        accessorKey: "term_months",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("capital.products.field.term_months")} />
        ),
      },
      {
        id: "interest_rate",
        accessorKey: "interest_rate",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("capital.contracts.field.interest_rate")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatRatePercent(row.original.interest_rate)}</span>
        ),
      },
      {
        id: "currency_code",
        accessorKey: "currency_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.currency")} />
        ),
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.currency_code}</span>,
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

  const {
    items,
    isPending,
    isFetching,
    error: loadError,
    refetch,
  } = useServerList<CapitalProduct>({
    queryKey: ["capital", "products", "list"],
    query: {},
    queryFn: () => capitalApi.listProducts(true),
  })

  const { table, total } = useClientListTable<CapitalProduct>({
    columns,
    items,
    filterBy: {
      code: (item, value) => matchTextColumnFilter(value, item.code, item.name),
    },
    sort: (rows, sorting) =>
      sortByColumn(rows, sorting, {
        code: (a, b) => a.code.localeCompare(b.code),
        name: (a, b) => a.name.localeCompare(b.name),
        fund_type_code: (a, b) => a.fund_type_code.localeCompare(b.fund_type_code),
        term_months: (a, b) => a.term_months - b.term_months,
        interest_rate: (a, b) => a.interest_rate - b.interest_rate,
        currency_code: (a, b) => a.currency_code.localeCompare(b.currency_code),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <ListPageShell
      title={t("capital.products.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("capital.count", { count: total })}
        </Badge>
      }
      criticalPending={isPending}
      criticalError={loadError}
      onRetry={() => void refetch()}
      fetching={isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setCreateOpen(true)}
          createLabel={t("capital.products.create")}
          exportFilename={t("capital.products.title")}
          sheetName={t("capital.products.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <>
          <ProductDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            product={null}
            onSaved={() => void refetch()}
          />
          <ProductDialog
            open={editTarget !== null}
            onOpenChange={(next) => !next && setEditTarget(null)}
            product={editTarget}
            onSaved={() => void refetch()}
          />
        </>
      }
    />
  )
}
