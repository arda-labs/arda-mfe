import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { Badge } from "@workspace/ui/components/badge"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import {
  selectFilterMeta,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { formatDateShort, formatRatePercent } from "@workspace/format"
import { depositApi, type SavingsProduct } from "../api"
import { productsListDefinition } from "./list-query"
import { ProductFormDialog } from "./components/ProductFormDialog"

/** Deposit products catalog (DPM) — server tier, upsert via POST/PUT. */
export function ProductsPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SavingsProduct | null>(null)

  const columns = useMemo<ColumnDef<SavingsProduct>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("common.field.code"),
          t("deposit.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.code}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.name")}
          />
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "term_months",
        accessorKey: "term_months",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("deposit.products.field.term_months")}
          />
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
        id: "currency_code",
        accessorKey: "currency_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.currency")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.currency_code}</span>
        ),
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.created")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {formatDateShort(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "is_active",
        accessorKey: "is_active",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.status")}
          />
        ),
        enableColumnFilter: true,
        meta: selectFilterMeta(
          t("common.field.status"),
          [
            { value: "true", label: t("deposit.status.active") },
            { value: "false", label: t("deposit.status.inactive") },
          ]
        ),
        cell: ({ row }) => (
          <Status variant={row.original.is_active ? "success" : "default"}>
            <StatusIndicator />
            <StatusLabel>
              {row.original.is_active
                ? t("deposit.status.active")
                : t("deposit.status.inactive")}
            </StatusLabel>
          </Status>
        ),
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right">{t("common.field.action")}</div>
        ),
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
  } = useServerDataTable<SavingsProduct>({
    ...productsListDefinition,
    columns,
    queryFn: async (q) =>
      depositApi.listProducts({
        q: q.q === undefined ? undefined : String(q.q),
        is_active: q.is_active === undefined ? undefined : String(q.is_active),
        sort: q.sort,
        order: q.order,
      }),
  })

  return (
    <ListPageShell
      title={t("deposit.products.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("deposit.count", { count: total })}
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
          createLabel={t("deposit.products.create")}
          exportFilename={t("deposit.products.title")}
          sheetName={t("deposit.products.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <>
          <ProductFormDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            product={null}
            onSaved={() => void refetch()}
          />
          <ProductFormDialog
            open={editTarget !== null}
            onOpenChange={(nextOpen) => !nextOpen && setEditTarget(null)}
            product={editTarget}
            onSaved={() => void refetch()}
          />
        </>
      }
    />
  )
}
