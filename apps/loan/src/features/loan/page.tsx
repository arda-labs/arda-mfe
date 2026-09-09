import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n, translateApiError } from "@workspace/i18n"
import { useAppQueryClient } from "@workspace/query/provider"
import { notify } from "@workspace/ui/feedback/notify"
import { navigateTo } from "@workspace/ui/shell/routing"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { textSearchMeta } from "@workspace/list-page/column-filters"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { formatDateShort, formatMoney, fromMinor } from "@workspace/format"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { loanApi, type LoanContract } from "../api"
import { caseDisplayLabel, truncateMiddle } from "../case-display"
import { loanContractsListDefinition } from "./list-query"
import { ContractDialog } from "./components/ContractDialog"
import { ContractDetailDialog } from "./components/ContractDetailDialog"

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "ACTIVE":
    case "APPROVED":
      return "default"
    case "PENDING":
    case "DRAFT":
      return "secondary"
    case "REJECTED":
    case "CANCELLED":
      return "destructive"
    default:
      return "outline"
  }
}

function contractStatusLabelKey(status: string): string {
  switch (status) {
    case "DRAFT":
      return "loan.status.draft"
    case "PENDING":
      return "loan.status.pending"
    case "ACTIVE":
      return "loan.status.active"
    case "REJECTED":
      return "loan.status.rejected"
    case "CLOSED":
      return "loan.status.closed"
    default:
      return "loan.status.draft"
  }
}

/**
 * Loans hub — dual-table page. The contracts table (transactional, grows
 * unbounded) runs on the server tier inside ListPageShell; the adjustment
 * flows sub-table is the second catalog and lives in the shell's `header`
 * slot — ListPageShell owns one panel table, so stacking keeps both visible
 * like today without restructuring into tabs. Contract rows carry the detail
 * dialog (status-driven actions + formation case id).
 */
export function LoanPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const queryClient = useAppQueryClient()
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [contractDialogOpen, setContractDialogOpen] = useState(false)
  const [detailContract, setDetailContract] = useState<LoanContract | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const submitContract = useCallback(
    async (contract: LoanContract) => {
      setSubmittingId(contract.id)
      try {
        const updated = await loanApi.submitContract(contract.id)
        // BE SubmitContract returns the row with the formation case stamped —
        // show the friendly case_code (fallback: the case uuid) so the case
        // is traceable in the workbench from the start.
        const caseLabel = caseDisplayLabel(
          updated.workflow_case_code,
          updated.workflow_case_id
        )
        notify.success(
          caseLabel
            ? t("loan.submitted_with_case", { case: caseLabel })
            : t("loan.submitted")
        )
        await queryClient.invalidateQueries({ queryKey: ["loan", "contracts", "list"] })
        return updated
      } catch (error) {
        notify.error(translateApiError(error, t("loan.submit_failed")))
        throw error
      } finally {
        setSubmittingId(null)
      }
    },
    [queryClient, t]
  )

  const columns = useMemo<ColumnDef<LoanContract>[]>(
    () => [
      {
        // Outside the BE sort whitelist (created_at | contract_no |
        // loan_amt_minor) — headers must not advertise a sort the API drops.
        id: "contract_code",
        accessorKey: "contract_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.contract_code")} />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">
            {row.original.contract_code}
          </span>
        ),
      },
      {
        // Toolbar search box: urlKey `contract_no` maps to the API `q`
        // parameter (BE ILIKEs contract_no + customer_code together), same
        // remap pattern as the finance journal list.
        id: "contract_no",
        accessorKey: "contract_no",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.contract_no")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan.field.contract_no"), t("loan.placeholder.search")),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.contract_no ?? "—"}
          </span>
        ),
      },
      {
        id: "customer_code",
        accessorKey: "customer_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.customer")} />
        ),
        enableSorting: false,
      },
      {
        id: "loan_amt_minor",
        accessorKey: "loan_amt_minor",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.amount")} />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMoney(fromMinor(row.original.loan_amt_minor))}
          </span>
        ),
      },
      {
        id: "interest_rate",
        accessorKey: "interest_rate",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.interest_rate")} />
        ),
        enableSorting: false,
      },
      {
        id: "loan_term",
        accessorKey: "loan_term",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.term")} />
        ),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.loan_term != null ? (
            <span className="tabular-nums">
              {row.original.loan_term} {row.original.term_unit ?? ""}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "contract_date",
        accessorKey: "contract_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.contract_date")} />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {formatDateShort(row.original.contract_date)}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.status")} />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>
            {t(contractStatusLabelKey(row.original.status))}
          </Badge>
        ),
      },
      {
        id: "workflow_case_id",
        accessorKey: "workflow_case_id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.case")} />
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const caseLabel = caseDisplayLabel(
            row.original.workflow_case_code,
            row.original.workflow_case_id
          )
          return caseLabel ? (
            <span
              className="block max-w-44 truncate font-mono text-xs text-muted-foreground"
              title={caseLabel}
            >
              {truncateMiddle(caseLabel)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">{t("loan.field.actions")}</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => {
                setDetailContract(row.original)
                setDetailOpen(true)
              }}
            >
              {t("loan.detail.action")}
            </Button>
            {row.original.status === "DRAFT" ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                disabled={submittingId === row.original.id}
                onClick={() => void submitContract(row.original)}
              >
                {t("loan.submit")}
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [submitContract, submittingId, t]
  )

  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
  } = useServerDataTable<LoanContract>({
    ...loanContractsListDefinition,
    columns,
    queryFn: async (query) =>
      loanApi.listContracts({
        q: query.q === undefined ? undefined : String(query.q),
        page: query.page,
        per_page: query.perPage,
        sort: query.sort,
        order: query.order,
      }),
  })

  return (
    <ListPageShell
      title={t("loan.title")}
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
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setContractDialogOpen(true)}
          createLabel={t("loan.create")}
        />
      }
      header={
        <>
          <p className="text-sm text-muted-foreground">{t("loan.description")}</p>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                {t("loan.adjustment_screen.index_title")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("loan.adjustment_screen.index_description")}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigateTo("/loans/adjustments")}>
              {t("loan.adjustment_screen.open")}
            </Button>
          </div>
        </>
      }
      dialogs={
        <>
          <ContractDialog
            open={contractDialogOpen}
            onOpenChange={setContractDialogOpen}
            onSaved={async () => {
              await refetch()
            }}
          />
          <ContractDetailDialog
            contract={detailContract}
            open={detailOpen}
            onOpenChange={setDetailOpen}
            onSubmit={submitContract}
            submitting={detailContract ? submittingId === detailContract.id : false}
          />
        </>
      }
    />
  )
}
