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
import { formatDateShort, formatAmount, fromMinor } from "@workspace/format"
import { CheckCircle2, Plus } from "lucide-react"
import { disbursementApi, type LoanDisbursement } from "../api"
import { DisbursementCreateDialog } from "./components/DisbursementCreateDialog"

const DEFAULT_PAGE_SIZE = 10

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  APPROVED: "default",
  POSTED: "default",
  REJECTED: "destructive",
  CANCELLED: "outline",
}

/** Disbursements — drawdown flow (LNM.300.02): create → submit case →
 * approval → finance posting. */
export function DisbursementsPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const [items, setItems] = useState<LoanDisbursement[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await disbursementApi.list()
      setItems(result.items)
    } catch (error) {
      notify.error(translateApiError(error, t("loan.load_failed")))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const submit = useCallback(async (item: LoanDisbursement) => {
    try {
      await disbursementApi.submit(item.id)
      notify.success(t("loan.submitted"))
      await load()
    } catch (error) {
      notify.error(translateApiError(error, t("loan.submit_failed")))
    }
  }, [load, t])

  const columns = useMemo<ColumnDef<LoanDisbursement>[]>(
    () => [
      {
        accessorKey: "agreement_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Hợp đồng GD" />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta("Hợp đồng GD", "Tìm…"),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.agreement_code}</span>
        ),
      },
      {
        accessorKey: "contract_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Hợp đồng tín dụng" />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta("Hợp đồng tín dụng", "Tìm…"),
      },
      {
        accessorKey: "disburse_amt_minor",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Số tiền giải ngân" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {formatAmount(fromMinor(row.original.disburse_amt_minor, row.original.currency_code), row.original.currency_code)}
          </span>
        ),
      },
      {
        accessorKey: "disburse_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Ngày giải ngân" />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDateShort(row.original.disburse_date)}</span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.status")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan.field.status"), "DRAFT…"),
        cell: ({ row }) => (
          <Badge variant={statusVariant[row.original.status] ?? "outline"}>
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
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => void submit(row.original)}
            >
              <CheckCircle2 className="size-3.5" />
              {t("loan.submit")}
            </Button>
          ) : null,
      },
    ],
    [submit, t]
  )

  const { table, total } = useClientListTable({
    columns,
    items,
    filterBy: {
      agreement_code: (item, value) => matchTextColumnFilter(value, item.agreement_code),
      contract_code: (item, value) => matchTextColumnFilter(value, item.contract_code),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        agreement_code: (a, b) => a.agreement_code.localeCompare(b.agreement_code),
        disburse_date: (a, b) => a.disburse_date.localeCompare(b.disburse_date),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
      <PageHeader
        title="Giải ngân"
        description="Tạo phiếu giải ngân, trình duyệt qua workbench; duyệt xong bút toán tự post vào kế toán."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Thêm giải ngân
          </Button>
        }
      />

      <div className="relative min-h-0 flex-1">
        {loading ? (
          <DataTableSkeleton columnCount={6} rowCount={6} />
        ) : (
          <DataTable table={table} totalRows={total} className="min-h-0 flex-1">
            <ListTableToolbar
              table={table}
              onCreate={() => setCreateOpen(true)}
              createLabel="Thêm giải ngân"
            />
          </DataTable>
        )}
      </div>

      <DisbursementCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={load}
      />
    </section>
  )
}
