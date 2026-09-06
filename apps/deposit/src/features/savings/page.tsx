import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { DataTableSkeleton } from "@workspace/ui/components/data-table/data-table-skeleton"
import { PageHeader } from "@workspace/ui/components/page-header"
import { matchTextColumnFilter, textSearchMeta } from "@workspace/admin-list/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/admin-list/client-list"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"
import { formatDateShort, formatAmount, formatRatePercent, fromMinor } from "@workspace/format"
import { Plus } from "lucide-react"
import { depositApi, type Savings } from "../api"
import { OpenSavingsDialog } from "./components/OpenSavingsDialog"

const DEFAULT_PAGE_SIZE = 10

/** Savings — citizen deposit accounts (DPM): list + open + settle. */
export function SavingsPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const [items, setItems] = useState<Savings[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await depositApi.listSavings()
      setItems(result.items)
    } catch {
      notify.error("Không thể tải sổ tiết kiệm")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const settle = useCallback(async (item: Savings) => {
    try {
      await depositApi.settleSavings(item.savings_code)
      notify.success("Đã tất toán sổ")
      await load()
    } catch {
      notify.error("Không thể tất toán")
    }
  }, [load])

  const columns = useMemo<ColumnDef<Savings>[]>(
    () => [
      {
        accessorKey: "savings_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Mã sổ" />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta("Mã sổ", "Tìm…"),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.savings_code}</span>
        ),
      },
      {
        accessorKey: "customer_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Khách hàng" />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta("Khách hàng", "Tìm…"),
      },
      {
        accessorKey: "principal_minor",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Gốc" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {formatAmount(fromMinor(row.original.principal_minor, row.original.currency_code), row.original.currency_code)}
          </span>
        ),
      },
      {
        accessorKey: "accrued_minor",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Lãi tích lũy" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatAmount(fromMinor(row.original.accrued_minor, row.original.currency_code), row.original.currency_code)}
          </span>
        ),
      },
      {
        accessorKey: "open_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Mở sổ" />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDateShort(row.original.open_date)}</span>
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
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.status") || "Trạng thái"} />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.status === "ACTIVE" ? "default" : "outline"}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.status === "ACTIVE" ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => void settle(row.original)}
            >
              Tất toán
            </Button>
          ) : null,
      },
    ],
    [settle, t]
  )

  const { table, total } = useClientListTable({
    columns,
    items,
    filterBy: {
      savings_code: (item, value) => matchTextColumnFilter(value, item.savings_code),
      customer_code: (item, value) => matchTextColumnFilter(value, item.customer_code),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        savings_code: (a, b) => a.savings_code.localeCompare(b.savings_code),
        open_date: (a, b) => a.open_date.localeCompare(b.open_date),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
      <PageHeader
        title="Sổ tiết kiệm"
        description="Mở sổ, gửi thêm, tất toán — bút toán qua PostingService."
        actions={
          <Button onClick={() => setOpenDialog(true)}>
            <Plus className="size-4" />
            Mở sổ
          </Button>
        }
      />

      <div className="relative min-h-0 flex-1">
        {loading ? (
          <DataTableSkeleton columnCount={8} rowCount={6} />
        ) : (
          <DataTable table={table} totalRows={total} className="min-h-0 flex-1">
            <ListTableToolbar
              table={table}
              onCreate={() => setOpenDialog(true)}
              createLabel="Mở sổ"
            />
          </DataTable>
        )}
      </div>

      <OpenSavingsDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        onSaved={load}
      />
    </section>
  )
}

export { formatRatePercent }
