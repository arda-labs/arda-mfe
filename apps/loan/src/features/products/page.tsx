import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n, translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { DataTableSkeleton } from "@workspace/ui/components/data-table/data-table-skeleton"
import { PageHeader } from "@workspace/ui/components/page-header"
import {
  activeStatusMeta,
  matchBooleanActiveFilter,
  matchTextColumnFilter,
  textSearchMeta,
} from "@workspace/admin-list/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/admin-list/client-list"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"
import { Edit2, Plus } from "lucide-react"
import { formatMoney, formatRatePercent } from "@workspace/format"
import { productApi, type LoanProduct } from "../api"
import { ProductDialog } from "./components/ProductDialog"

const DEFAULT_PAGE_SIZE = 10

export function ProductsPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const [products, setProducts] = useState<LoanProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<LoanProduct | null>(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const result = await productApi.listProducts()
      setProducts(result)
    } catch (error) {
      notify.error(translateApiError(error, t("loan_products.load_failed")))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const columns = useMemo<ColumnDef<LoanProduct>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan_products.field.code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan_products.field.code"), t("loan.placeholder.search")),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.code}</span>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan_products.field.name")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan_products.field.name"), t("loan.placeholder.search")),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "interest_rate",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan_products.field.rate")} />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatRatePercent(row.original.interest_rate)}</span>
        ),
      },
      {
        accessorKey: "max_amount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan_products.field.max_amount")} />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatMoney(row.original.max_amount)}</span>
        ),
      },
      {
        accessorKey: "acc_classification",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("loan_products.field.classification")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.acc_classification || "—"}
          </span>
        ),
      },
      {
        id: "is_active",
        accessorKey: "is_active",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.status")} />
        ),
        enableColumnFilter: true,
        meta: activeStatusMeta(t("loan.field.status"), t("status_active"), t("status_inactive")),
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "outline"}>
            {row.original.is_active ? t("status_active") : t("status_inactive")}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: t("loan.field.actions"),
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => {
              setEditing(row.original)
              setDialogOpen(true)
            }}
          >
            <Edit2 className="size-3.5" />
          </Button>
        ),
      },
    ],
    [t]
  )

  const { table, total } = useClientListTable({
    columns,
    items: products,
    filterBy: {
      code: (item, value) => matchTextColumnFilter(value, item.code),
      name: (item, value) => matchTextColumnFilter(value, item.name),
      is_active: (item, value) => matchBooleanActiveFilter(item, value),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        code: (a, b) => a.code.localeCompare(b.code),
        name: (a, b) => a.name.localeCompare(b.name),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
      <PageHeader
        title={t("loan_products.title")}
        description={t("loan_products.description")}
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="size-4" />
            {t("loan_products.create")}
          </Button>
        }
      />

      <div className="relative min-h-0 flex-1">
        {loading ? (
          <DataTableSkeleton columnCount={7} rowCount={6} />
        ) : (
          <DataTable table={table} totalRows={total} className="min-h-0 flex-1">
            <ListTableToolbar
              table={table}
              onCreate={openCreate}
              createLabel={t("loan_products.create")}
            />
          </DataTable>
        )}
      </div>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={loadProducts}
      />
    </section>
  )
}
