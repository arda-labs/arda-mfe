import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { textSearchMeta } from "@workspace/list-page/column-filters"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { formatDateShort, formatAmount, formatRatePercent, fromMinor } from "@workspace/format"
import { capitalApi, type CapitalContract } from "../api"
import { contractsListDefinition } from "./list-query"
import { CreateContractDialog } from "./components/CreateContractDialog"

/**
 * Fund contracts (CFM): server tier, create-only — the BE exposes no
 * update/delete endpoint for contracts, so rows carry no edit action.
 */
export function ContractsPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const [createOpen, setCreateOpen] = useState(false)

  const columns = useMemo<ColumnDef<CapitalContract>[]>(
    () => [
      {
        id: "contract_code",
        accessorKey: "contract_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("capital.contracts.field.contract_code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("capital.contracts.field.contract_code"),
          t("capital.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.contract_code}</span>
        ),
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
      },
      {
        id: "counterparty_code",
        accessorKey: "counterparty_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("capital.contracts.field.counterparty")}
          />
        ),
      },
      {
        id: "amount_minor",
        accessorKey: "amount_minor",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("capital.contracts.field.amount")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {formatAmount(fromMinor(row.original.amount_minor, row.original.currency_code), row.original.currency_code)}
          </span>
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
        id: "contract_date",
        accessorKey: "contract_date",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("capital.contracts.field.contract_date")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDateShort(row.original.contract_date)}</span>
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

  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
  } = useServerDataTable<CapitalContract>({
    ...contractsListDefinition,
    columns,
    queryFn: async (q) =>
      capitalApi.listContracts({
        page: q.page,
        perPage: q.perPage,
        q: q.q === undefined ? undefined : String(q.q),
        sort: q.sort,
        order: q.order,
      }),
  })

  return (
    <ListPageShell
      title={t("capital.contracts.title")}
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
          createLabel={t("capital.contracts.create")}
          exportFilename={t("capital.contracts.title")}
          sheetName={t("capital.contracts.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <CreateContractDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSaved={() => void refetch()}
        />
      }
    />
  )
}
