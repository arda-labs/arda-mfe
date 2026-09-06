import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { DataTableSkeleton } from "@workspace/ui/components/data-table/data-table-skeleton"
import { PageHeader } from "@workspace/ui/components/page-header"
import { matchTextColumnFilter, textSearchMeta } from "@workspace/admin-list/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/admin-list/client-list"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"
import { formatDateShort, formatAmount, formatRatePercent, fromMinor } from "@workspace/format"
import { depositApi, type InterbankDeposit } from "../api"

const DEFAULT_PAGE_SIZE = 10

/** Interbank deposits (IBM): contracts with TCTD đối tác. */
export function InterbankPage(_props: { pathname: string }) {
  const [items, setItems] = useState<InterbankDeposit[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await depositApi.listInterbank()
      setItems(result.items)
    } catch {
      notify.error("Không thể tải tiền gửi liên ngân hàng")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const columns = useMemo<ColumnDef<InterbankDeposit>[]>(
    () => [
      {
        accessorKey: "deposit_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Mã HĐ" />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta("Mã HĐ", "Tìm…"),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.deposit_code}</span>
        ),
      },
      {
        accessorKey: "counterparty_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Đối tác" />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta("Đối tác", "Tìm…"),
      },
      {
        accessorKey: "principal_minor",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Số tiền gửi" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {formatAmount(fromMinor(row.original.principal_minor, row.original.currency_code), row.original.currency_code)}
          </span>
        ),
      },
      {
        accessorKey: "interest_rate",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Lãi suất" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatRatePercent(row.original.interest_rate)}</span>
        ),
      },
      {
        accessorKey: "deposit_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Ngày gửi" />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDateShort(row.original.deposit_date)}</span>
        ),
      },
      {
        accessorKey: "maturity_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Đáo hạn" />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDateShort(row.original.maturity_date)}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "TT",
        cell: ({ row }) => (
          <Badge variant={row.original.status === "ACTIVE" ? "default" : "outline"}>
            {row.original.status}
          </Badge>
        ),
      },
    ],
    []
  )

  const { table, total } = useClientListTable({
    columns,
    items,
    filterBy: {
      deposit_code: (item, value) => matchTextColumnFilter(value, item.deposit_code),
      counterparty_code: (item, value) => matchTextColumnFilter(value, item.counterparty_code),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        deposit_code: (a, b) => a.deposit_code.localeCompare(b.deposit_code),
        deposit_date: (a, b) => a.deposit_date.localeCompare(b.deposit_date),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
      <PageHeader
        title="Tiền gửi liên ngân hàng"
        description="Hợp đồng gửi/nhận vốn tại các tổ chức tín dụng khác."
      />

      <div className="relative min-h-0 flex-1">
        {loading ? (
          <DataTableSkeleton columnCount={7} rowCount={6} />
        ) : (
          <DataTable table={table} totalRows={total} className="min-h-0 flex-1">
            <ListTableToolbar table={table} />
          </DataTable>
        )}
      </div>
    </section>
  )
}
