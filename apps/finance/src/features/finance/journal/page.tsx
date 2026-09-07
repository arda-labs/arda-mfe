import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { textSearchMeta } from "@workspace/list-page/column-filters"
import { formatDateShort } from "@workspace/format"
import { Sparkles } from "lucide-react"
import { postingApi, type JournalEntry } from "../api"
import { journalListDefinition } from "./list-query"
import { PostingPreviewDialog } from "./components/PostingPreviewDialog"

/** Journal — posted entries per the PostingService (P1a.6), read-only. */
export function JournalPage(_props?: { pathname?: string }) {
  const { t } = useI18n()
  const [previewOpen, setPreviewOpen] = useState(false)

  const columns = useMemo<ColumnDef<JournalEntry>[]>(
    () => [
      {
        id: "entry_no",
        accessorKey: "entry_no",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("finance.journal.field.entry_no")} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">
            JE-{String(row.original.entry_no).padStart(6, "0")}
          </span>
        ),
      },
      {
        id: "accounting_date",
        accessorKey: "accounting_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("finance.journal.field.accounting_date")} />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {formatDateShort(row.original.accounting_date)}
          </span>
        ),
      },
      {
        id: "document_type",
        accessorKey: "document_type",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("finance.journal.field.document_type")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("finance.journal.field.document_type"),
          t("finance.journal.placeholder.search")
        ),
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.document_type}</Badge>
        ),
      },
      {
        id: "business_domain",
        accessorKey: "business_domain",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("finance.journal.field.business_domain")} />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.business_domain}
          </span>
        ),
      },
      {
        id: "description",
        accessorKey: "description",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("finance.journal.field.description")} />
        ),
        enableSorting: false,
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.status")} />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant={row.original.status === "POSTED" ? "default" : "outline"}>
            {row.original.status}
          </Badge>
        ),
      },
    ],
    [t]
  )

  /**
   * Server-driven list controller: URL page/perPage + `document_type`→q
   * filter and whitelisted sort <-> TanStack Query cache. Journal grows
   * unbounded (one row per posted entry), so the old limit:200
   * pseudo-pagination is replaced by real BE paging.
   */
  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
  } = useServerDataTable<JournalEntry>({
    ...journalListDefinition,
    columns,
    queryFn: async (query) =>
      postingApi.listJournalPaged({
        page: query.page,
        perPage: query.perPage,
        q: query.document_type === undefined ? undefined : String(query.document_type),
        sort: query.sort,
        order: query.order,
      }),
  })

  return (
    <ListPageShell
      title={t("finance.journal.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {t("finance.journal.count", { count: total })}
        </Badge>
      }
      criticalPending={isLoading}
      criticalError={loadError}
      onRetry={() => void refetch()}
      loadErrorTitle={t("finance.journal.load_failed")}
      fetching={isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          exportFilename={t("finance.journal.title")}
          sheetName={t("finance.journal.title")}
          totalRowsCount={total}
        >
          <Button variant="outline" className="h-8 px-3 text-xs font-semibold" onClick={() => setPreviewOpen(true)}>
            <Sparkles className="mr-1 size-3.5" />
            {t("finance.journal.preview")}
          </Button>
        </ListTableToolbar>
      }
      dialogs={
        <PostingPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      }
    />
  )
}
