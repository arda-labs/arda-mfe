import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import {
  activeStatusMeta,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { Edit2 } from "lucide-react"
import { formatMoney, formatRatePercent, fromMinor } from "@workspace/format"
import { productApi, type LoanProduct } from "../api"
import { productsListDefinition } from "./list-query"
import { ProductDialog } from "./components/ProductDialog"

/**
 * Credit product catalog — server tier: page/perPage/sort/is_active are
 * URL-synced, the toolbar search `q` filters code+name in SQL (BE
 * productListSpec whitelist). Sortable column ids equal the BE whitelist.
 */
export function ProductsPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<LoanProduct | null>(null)

  const columns = useMemo<ColumnDef<LoanProduct>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.loan_products.field.code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan.loan_products.field.code"), t("loan.placeholder.search")),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.code}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.loan_products.field.name")} />
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "interest_rate",
        accessorKey: "interest_rate",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.loan_products.field.rate")} />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatRatePercent(row.original.interest_rate)}</span>
        ),
      },
      {
        id: "max_amount_minor",
        accessorKey: "max_amount_minor",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.loan_products.field.max_amount")} />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatMoney(fromMinor(row.original.max_amount_minor))}</span>
        ),
      },
      {
        id: "acc_classification",
        accessorKey: "acc_classification",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("loan.loan_products.field.classification")}
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
        meta: activeStatusMeta(t("loan.field.status"), t("loan.status_active"), t("loan.status_inactive")),
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "outline"}>
            {row.original.is_active ? t("loan.status_active") : t("loan.status_inactive")}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">{t("loan.field.actions")}</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              onClick={() => {
                setEditing(row.original)
                setDialogOpen(true)
              }}
              title={t("loan.loan_products.edit")}
            >
              <Edit2 className="size-3.5" />
            </Button>
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
  } = useServerDataTable<LoanProduct>({
    ...productsListDefinition,
    columns,
    queryFn: async (q) =>
      productApi.listProducts({
        q: q.q === undefined ? undefined : String(q.q),
        is_active: q.is_active === undefined ? undefined : String(q.is_active),
        page: q.page,
        per_page: q.perPage,
        sort: q.sort,
        order: q.order,
      }),
  })

  return (
    <ListPageShell
      title={t("loan.loan_products.title")}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("loan.count_badge", { count: total })}
        </Badge>
      }
      criticalPending={isLoading}
      criticalError={loadError}
      onRetry={() => void refetch()}
      fetching={isFetching}
      table={table}
      header={<p className="text-sm text-muted-foreground">{t("loan.loan_products.description")}</p>}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
          createLabel={t("loan.loan_products.create")}
        />
      }
      dialogs={
        <ProductDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editing={editing}
          onSaved={async () => {
            await refetch()
          }}
        />
      }
    />
  )
}
