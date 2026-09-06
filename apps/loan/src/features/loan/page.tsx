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
  matchTextColumnFilter,
  textSearchMeta,
} from "@workspace/admin-list/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/admin-list/client-list"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { formatDateShort, formatMoney } from "@workspace/format"
import { Plus } from "lucide-react"
import {
  loanAdjustmentKinds,
  loanApi,
  type LoanAdjustment,
  type LoanAdjustmentKind,
  type LoanContract,
} from "../api"
import { ContractDialog } from "./components/ContractDialog"

const DEFAULT_PAGE_SIZE = 10

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

export function LoanPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const [contracts, setContracts] = useState<LoanContract[]>([])
  const [loadingContracts, setLoadingContracts] = useState(true)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [contractDialogOpen, setContractDialogOpen] = useState(false)

  const [kind, setKind] = useState<LoanAdjustmentKind>("debt-change")
  const [adjustments, setAdjustments] = useState<LoanAdjustment[]>([])
  const [loadingAdjustments, setLoadingAdjustments] = useState(false)
  const [submittingAdjustmentId, setSubmittingAdjustmentId] = useState<string | null>(null)

  const loadContracts = useCallback(async () => {
    setLoadingContracts(true)
    try {
      const result = await loanApi.listContracts()
      setContracts(result)
    } catch (error) {
      notify.error(translateApiError(error, t("loan.load_failed")))
    } finally {
      setLoadingContracts(false)
    }
  }, [t])

  const loadAdjustments = useCallback(async () => {
    setLoadingAdjustments(true)
    try {
      const result = await loanApi.listAdjustments(kind)
      setAdjustments(result)
    } catch (error) {
      notify.error(translateApiError(error, t("loan.load_failed")))
    } finally {
      setLoadingAdjustments(false)
    }
  }, [kind, t])

  useEffect(() => {
    void loadContracts()
  }, [loadContracts])

  useEffect(() => {
    void loadAdjustments()
  }, [loadAdjustments])

  const submitContract = async (contract: LoanContract) => {
    setSubmittingId(contract.id)
    try {
      await loanApi.submitContract(contract.id)
      notify.success(t("loan.submitted"))
      await loadContracts()
    } catch (error) {
      notify.error(translateApiError(error, t("loan.submit_failed")))
    } finally {
      setSubmittingId(null)
    }
  }

  const submitAdjustment = async (adjustment: LoanAdjustment) => {
    setSubmittingAdjustmentId(adjustment.id)
    try {
      await loanApi.submitAdjustment(kind, adjustment.id)
      notify.success(t("loan.submitted"))
      await loadAdjustments()
    } catch (error) {
      notify.error(translateApiError(error, t("loan.submit_failed")))
    } finally {
      setSubmittingAdjustmentId(null)
    }
  }

  const contractColumns = useMemo<ColumnDef<LoanContract>[]>(
    () => [
      {
        accessorKey: "contract_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.contract_code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan.field.contract_code"), t("loan.placeholder.search")),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">
            {row.original.contract_code}
          </span>
        ),
      },
      {
        accessorKey: "customer_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.customer")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan.field.customer"), t("loan.placeholder.search")),
      },
      {
        accessorKey: "loan_amt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.amount")} />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMoney(row.original.loan_amt)}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.status")} />
        ),
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: t("loan.field.actions"),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.status === "DRAFT" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={submittingId === row.original.id}
              onClick={() => void submitContract(row.original)}
            >
              {t("loan.submit")}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, submittingId]
  )

  const contractTable = useClientListTable({
    columns: contractColumns,
    items: contracts,
    filterBy: {
      contract_code: (item, value) =>
        matchTextColumnFilter(value, item.contract_code, item.contract_no ?? ""),
      customer_code: (item, value) => matchTextColumnFilter(value, item.customer_code),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        contract_code: (a, b) => a.contract_code.localeCompare(b.contract_code),
        customer_code: (a, b) => a.customer_code.localeCompare(b.customer_code),
        loan_amt: (a, b) => a.loan_amt - b.loan_amt,
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const adjustmentColumns = useMemo<ColumnDef<LoanAdjustment>[]>(
    () => [
      {
        accessorKey: "contract_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.contract_code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan.field.contract_code"), t("loan.placeholder.search")),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">
            {row.original.contract_code}
          </span>
        ),
      },
      {
        id: "effective_date",
        accessorKey: "effective_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.effective_date")} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDateShort(row.original.effective_date)}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.amount")} />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatMoney(row.original.amount)}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.status")} />
        ),
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: t("loan.field.actions"),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.status === "DRAFT" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={submittingAdjustmentId === row.original.id}
              onClick={() => void submitAdjustment(row.original)}
            >
              {t("loan.submit")}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, kind, submittingAdjustmentId]
  )

  const adjustmentTable = useClientListTable({
    columns: adjustmentColumns,
    items: adjustments,
    filterBy: {
      contract_code: (item, value) => matchTextColumnFilter(value, item.contract_code),
      status: (item, value) => value === "" || item.status === value,
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        contract_code: (a, b) => a.contract_code.localeCompare(b.contract_code),
        amount: (a, b) => (a.amount ?? 0) - (b.amount ?? 0),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
      <PageHeader title={t("loan.title")} description={t("loan.description")} />

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("loan.contracts_title")}</h2>
          <Button onClick={() => setContractDialogOpen(true)}>
            <Plus className="size-4" />
            {t("loan.create")}
          </Button>
        </div>
        {loadingContracts ? (
          <DataTableSkeleton columnCount={5} rowCount={6} />
        ) : (
          <DataTable
            table={contractTable.table}
            totalRows={contractTable.total}
            className="min-h-0"
          >
            <ListTableToolbar
              table={contractTable.table}
              onCreate={() => setContractDialogOpen(true)}
              createLabel={t("loan.create")}
            />
          </DataTable>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">{t("loan.adjustments_title")}</h2>
          <Select value={kind} onValueChange={(value) => setKind(value as LoanAdjustmentKind)}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {loanAdjustmentKinds.map((entry) => (
                <SelectItem key={entry.key} value={entry.key}>
                  {t(entry.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {loadingAdjustments ? (
          <DataTableSkeleton columnCount={5} rowCount={6} />
        ) : (
          <DataTable
            table={adjustmentTable.table}
            totalRows={adjustmentTable.total}
            className="min-h-0"
          >
            <ListTableToolbar table={adjustmentTable.table} />
          </DataTable>
        )}
      </section>

      <ContractDialog
        open={contractDialogOpen}
        onOpenChange={setContractDialogOpen}
        onSaved={loadContracts}
      />
    </section>
  )
}
