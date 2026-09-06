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
import { sortByColumn, useClientListTable } from "@workspace/admin-list/client-list"
import { matchTextColumnFilter, textSearchMeta } from "@workspace/admin-list/column-filters"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"
import { formatDateShort, formatAmount, fromMinor } from "@workspace/format"
import { Sparkles } from "lucide-react"
import {
  postingApi,
  type JournalEntry,
} from "../api"
import { PostingPreviewDialog } from "./components/PostingPreviewDialog"

const DEFAULT_PAGE_SIZE = 20

/** Journal — posted entries per the PostingService (P1a.6). */
export function JournalPage(_props?: { pathname?: string }) {
  const { t } = useI18n()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await postingApi.listJournal({ limit: 200 })
      setEntries(result)
    } catch {
      notify.error("Không thể tải nhật ký chung")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const columns = useMemo<ColumnDef<JournalEntry>[]>(
    () => [
      {
        accessorKey: "entry_no",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Số CT" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">
            JE-{String(row.original.entry_no).padStart(6, "0")}
          </span>
        ),
      },
      {
        accessorKey: "accounting_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Ngày KT" />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta("Ngày KT", "YYYY-MM-DD"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {formatDateShort(row.original.accounting_date)}
          </span>
        ),
      },
      {
        accessorKey: "document_type",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Loại CT" />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta("Loại CT", "LNM_DISBURSEMENT…"),
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.document_type}</Badge>
        ),
      },
      {
        accessorKey: "business_domain",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Domain" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.business_domain}
          </span>
        ),
      },
      {
        accessorKey: "description",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Diễn giải" />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta("Diễn giải", "Tìm…"),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Trạng thái" />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.status === "POSTED" ? "default" : "outline"}>
            {row.original.status}
          </Badge>
        ),
      },
    ],
    [t]
  )

  const { table, total } = useClientListTable({
    columns,
    items: entries,
    filterBy: {
      document_type: (item, value) => matchTextColumnFilter(value, item.document_type),
      description: (item, value) => matchTextColumnFilter(value, item.description),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        entry_no: (a, b) => a.entry_no - b.entry_no,
        accounting_date: (a, b) => a.accounting_date.localeCompare(b.accounting_date),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
      <PageHeader
        title="Nhật ký chung"
        description="Bút toán đã post qua PostingService — không thể sửa, điều chỉnh bằng bút toán đảo."
        actions={
          <Button onClick={() => setPreviewOpen(true)}>
            <Sparkles className="size-4" />
            Preview bút toán
          </Button>
        }
      />

      <div className="relative min-h-0 flex-1">
        {loading ? (
          <DataTableSkeleton columnCount={6} rowCount={8} />
        ) : (
          <DataTable table={table} totalRows={total} className="min-h-0 flex-1">
            <ListTableToolbar table={table} />
          </DataTable>
        )}
      </div>

      <PostingPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </section>
  )
}

export function formatMinor(value: number, currency: string) {
  return formatAmount(fromMinor(value, currency), currency)
}
