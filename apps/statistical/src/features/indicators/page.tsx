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
import { statisticalApi, type Indicator } from "../api"

const DEFAULT_PAGE_SIZE = 10

/** Statistical indicator catalog (QCMS). */
export function IndicatorsPage(_props: { pathname: string }) {
  const [items, setItems] = useState<Indicator[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await statisticalApi.listIndicators()
      setItems(result.items)
    } catch {
      notify.error("Không thể tải chỉ tiêu thống kê")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const columns = useMemo<ColumnDef<Indicator>[]>(
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
          <DataTableColumnHeader column={column} label="Chỉ tiêu" />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta("Chỉ tiêu", "Tìm…"),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "unit",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Đơn vị" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.unit || "—"}</span>
        ),
      },
      {
        accessorKey: "group_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Nhóm" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.group_code || "—"}
          </span>
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
        title="Chỉ tiêu thống kê"
        description="Danh mục chỉ tiêu phục vụ báo cáo tuân thủ NHNN."
      />

      <div className="relative min-h-0 flex-1">
        {loading ? (
          <DataTableSkeleton columnCount={5} rowCount={6} />
        ) : (
          <DataTable table={table} totalRows={total} className="min-h-0 flex-1">
            <ListTableToolbar table={table} />
          </DataTable>
        )}
      </div>
    </section>
  )
}
