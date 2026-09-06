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
import { formatRatePercent } from "@workspace/format"
import { depositApi, type SavingsProduct } from "../api"

const DEFAULT_PAGE_SIZE = 10

/** Deposit products catalog (DPM). */
export function ProductsPage(_props: { pathname: string }) {
  const [items, setItems] = useState<SavingsProduct[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await depositApi.listProducts()
      setItems(result.items)
    } catch {
      notify.error("Không thể tải sản phẩm")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const columns = useMemo<ColumnDef<SavingsProduct>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Mã" />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta("Mã", "Tìm…"),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.code}</span>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Tên" />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta("Tên", "Tìm…"),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "term_months",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Kỳ hạn (tháng)" />
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
        accessorKey: "currency_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Loại tiền" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.currency_code}</span>
        ),
      },
      {
        accessorKey: "is_active",
        header: "TT",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "outline"}>
            {row.original.is_active ? "ACTIVE" : "OFF"}
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
      code: (item, value) => matchTextColumnFilter(value, item.code),
      name: (item, value) => matchTextColumnFilter(value, item.name),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        code: (a, b) => a.code.localeCompare(b.code),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
      <PageHeader
        title="Sản phẩm huy động"
        description="Danh mục sản phẩm tiền gửi dân cư — kỳ hạn và lãi suất."
      />

      <div className="relative min-h-0 flex-1">
        {loading ? (
          <DataTableSkeleton columnCount={6} rowCount={6} />
        ) : (
          <DataTable table={table} totalRows={total} className="min-h-0 flex-1">
            <ListTableToolbar table={table} />
          </DataTable>
        )}
      </div>
    </section>
  )
}
