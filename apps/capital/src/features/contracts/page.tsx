import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
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
import { capitalApi, type CapitalContract } from "../api"
import { CreateContractDialog } from "./components/CreateContractDialog"

const DEFAULT_PAGE_SIZE = 10

/** Fund contracts (CFM): list + create. */
export function ContractsPage(_props: { pathname: string }) {
  const [items, setItems] = useState<CapitalContract[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await capitalApi.listContracts()
      setItems(result.items)
    } catch {
      notify.error("Không thể tải hợp đồng vốn")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const columns = useMemo<ColumnDef<CapitalContract>[]>(
    () => [
      {
        accessorKey: "contract_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Mã HĐ" />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta("Mã HĐ", "Tìm…"),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.contract_code}</span>
        ),
      },
      {
        accessorKey: "fund_type_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Loại vốn" />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta("Loại vốn", "Tìm…"),
      },
      {
        accessorKey: "counterparty_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Đối tác" />
        ),
      },
      {
        accessorKey: "amount_minor",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Số vốn" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {formatAmount(fromMinor(row.original.amount_minor, row.original.currency_code), row.original.currency_code)}
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
        accessorKey: "contract_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Ngày HĐ" />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDateShort(row.original.contract_date)}</span>
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
      contract_code: (item, value) => matchTextColumnFilter(value, item.contract_code),
      fund_type_code: (item, value) => matchTextColumnFilter(value, item.fund_type_code),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        contract_code: (a, b) => a.contract_code.localeCompare(b.contract_code),
        contract_date: (a, b) => a.contract_date.localeCompare(b.contract_date),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
      <PageHeader
        title="Hợp đồng vốn"
        description="Hình thành hợp đồng vốn, thu/giải ngân vốn — bút toán qua PostingService."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Thêm hợp đồng
          </Button>
        }
      />

      <div className="relative min-h-0 flex-1">
        {loading ? (
          <DataTableSkeleton columnCount={7} rowCount={6} />
        ) : (
          <DataTable table={table} totalRows={total} className="min-h-0 flex-1">
            <ListTableToolbar
              table={table}
              onCreate={() => setCreateOpen(true)}
              createLabel="Thêm hợp đồng"
            />
          </DataTable>
        )}
      </div>

      <CreateContractDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={load}
      />
    </section>
  )
}
