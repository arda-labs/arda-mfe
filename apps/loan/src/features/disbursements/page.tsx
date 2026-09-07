import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n, translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import {
  selectFilterMeta,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { CheckCircle2 } from "lucide-react"
import { formatDateShort, formatAmount, fromMinor } from "@workspace/format"
import { disbursementApi, type LoanDisbursement } from "../api"
import { disbursementsListDefinition } from "./list-query"
import { DisbursementCreateDialog } from "./components/DisbursementCreateDialog"

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  APPROVED: "default",
  POSTED: "default",
  REJECTED: "destructive",
  CANCELLED: "outline",
}

const STATUS_VALUES = ["DRAFT", "SUBMITTED", "APPROVED", "POSTED", "REJECTED", "CANCELLED"] as const

/** Disbursements — drawdown flow (LNM.300.02): create → submit case →
 * approval → finance posting. Server tier after the BE adopted
 * ParseListRequest (q ILIKE + sort whitelist + SQL paging). */
export function DisbursementsPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const [createOpen, setCreateOpen] = useState(false)

  const statusLabels = useMemo<Record<string, string>>(
    () => ({
      DRAFT: t("loan.status.draft"),
      SUBMITTED: t("loan.status.submitted"),
      APPROVED: t("loan.status.approved"),
      POSTED: t("loan.status.posted"),
      REJECTED: t("loan.status.rejected"),
      CANCELLED: t("loan.status.cancelled"),
    }),
    [t]
  )

  const submit = useCallback(
    async (item: LoanDisbursement) => {
      try {
        await disbursementApi.submit(item.id)
        notify.success(t("loan.submitted"))
      } catch (error) {
        notify.error(translateApiError(error, t("loan.submit_failed")))
      }
    },
    [t]
  )

  const columns = useMemo<ColumnDef<LoanDisbursement>[]>(
    () => [
      {
        id: "agreement_code",
        accessorKey: "agreement_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.agreement_code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan.field.agreement_code"), t("loan.placeholder.search")),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.agreement_code}</span>
        ),
      },
      {
        id: "contract_code",
        accessorKey: "contract_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.contract_code")} />
        ),
      },
      {
        id: "disburse_amt_minor",
        accessorKey: "disburse_amt_minor",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.disbursements.field.amount")} />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {formatAmount(fromMinor(row.original.disburse_amt_minor, row.original.currency_code), row.original.currency_code)}
          </span>
        ),
      },
      {
        id: "disburse_date",
        accessorKey: "disburse_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.disbursements.field.disburse_date")} />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDateShort(row.original.disburse_date)}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.status")} />
        ),
        enableColumnFilter: true,
        meta: selectFilterMeta(
          t("loan.field.status"),
          STATUS_VALUES.map((value) => ({ label: statusLabels[value], value }))
        ),
        cell: ({ row }) => (
          <Badge variant={statusVariant[row.original.status] ?? "outline"}>
            {statusLabels[row.original.status] ?? row.original.status}
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
            {row.original.status === "DRAFT" ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => void submit(row.original)}
              >
                <CheckCircle2 className="size-3.5" />
                {t("loan.submit")}
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [statusLabels, submit, t]
  )

  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
  } = useServerDataTable<LoanDisbursement>({
    ...disbursementsListDefinition,
    columns,
    queryFn: async (query) =>
      disbursementApi.list({
        q: query.q === undefined ? undefined : String(query.q),
        status: query.status === undefined ? undefined : String(query.status),
        page: query.page,
        per_page: query.perPage,
        sort: query.sort,
        order: query.order,
      }),
  })

  return (
    <ListPageShell
      title={t("loan.disbursements.title")}
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
      header={<p className="text-sm text-muted-foreground">{t("loan.disbursements.description")}</p>}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setCreateOpen(true)}
          createLabel={t("loan.disbursements.create")}
        />
      }
      dialogs={
        <DisbursementCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSaved={() => void refetch()}
        />
      }
    />
  )
}
