import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { textSearchMeta } from "@workspace/list-page/column-filters"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { formatRatePercent } from "@workspace/format"
import { capitalApi, type CapitalProduct } from "../../api"
import { catalogsListDefinition } from "../list-query"
import { ProductDialog } from "./components/ProductDialog"

/** CFM fund-product catalog (sản phẩm vốn). */
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
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
  } = useServerDataTable<CapitalProduct>({
    ...catalogsListDefinition,
    queryKey: ["capital", "products", "list"],
    columns,
    queryFn: async () => capitalApi.listProducts(true),
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
      criticalPending={isLoading}
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
