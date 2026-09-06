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
import { matchTextColumnFilter, textSearchMeta } from "@workspace/admin-list/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/admin-list/client-list"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"
import { CheckCircle2, Plus } from "lucide-react"
import { statisticalApi, type ReportSubmission } from "../api"
import { CreateSubmissionDialog } from "./components/CreateSubmissionDialog"

const DEFAULT_PAGE_SIZE = 10

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
}

/** Report submissions (QCMS): create DRAFT → submit case → approval. */
export function SubmissionsPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const [items, setItems] = useState<ReportSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await statisticalApi.listSubmissions()
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

  const submit = useCallback(async (item: ReportSubmission) => {
    try {
      await statisticalApi.submitSubmission(item.id)
      notify.success(t("loan.submitted"))
      await load()
    } catch (error) {
      notify.error(translateApiError(error, t("loan.submit_failed")))
    }
  }, [load, t])

  const columns = useMemo<ColumnDef<ReportSubmission>[]>(
    () => [
      {
        accessorKey: "report_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Báo cáo" />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta("Báo cáo", "Tìm…"),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.report_code}</span>
        ),
      },
      {
        accessorKey: "period_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Kỳ" />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta("Kỳ", "2026-09"),
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
        accessorKey: "submitted_by",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Người nộp" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.submitted_by || "—"}</span>
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
      report_code: (item, value) => matchTextColumnFilter(value, item.report_code),
      period_code: (item, value) => matchTextColumnFilter(value, item.period_code),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        report_code: (a, b) => a.report_code.localeCompare(b.report_code),
        period_code: (a, b) => a.period_code.localeCompare(b.period_code),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
      <PageHeader
        title="Nộp báo cáo"
        description="Nộp báo cáo kỳ qua workbench duyệt — maker-checker chuẩn."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Tạo kỳ nộp
          </Button>
        }
      />

      <div className="relative min-h-0 flex-1">
        {loading ? (
          <DataTableSkeleton columnCount={5} rowCount={6} />
        ) : (
          <DataTable table={table} totalRows={total} className="min-h-0 flex-1">
            <ListTableToolbar
              table={table}
              onCreate={() => setCreateOpen(true)}
              createLabel="Tạo kỳ nộp"
            />
          </DataTable>
        )}
      </div>

      <CreateSubmissionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={load}
      />
    </section>
  )
}
