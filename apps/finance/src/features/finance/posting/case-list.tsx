import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useNavigate } from "react-router-dom"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { SavedViewTabs } from "@workspace/list-page/saved-view-tabs"
import { useRecordSheet } from "@workspace/list-page/use-record-sheet"
import { formatDateShort } from "@workspace/format"
import { Plus, Upload } from "lucide-react"
import { postingApi, type JournalEntry } from "../api"
import { POSTING_STATUSES, postingListDefinition, postingStatusParam } from "./list-query"
import { PostingCaseSheet } from "./case-sheet"
import { ImportPostingDialog } from "./import-posting-dialog"
import type { PostingFlow } from "../api"
import { StatusBadge } from "@workspace/ui/components/status-badge"

/** Title key + create-route per flow — the four posting case lists share the
 * same columns and list contract, only the pinned document type differs. */
const FLOW_META: Record<PostingFlow, { titleKey: string; createPath: string; createKey: string }> = {
  SINGLE_ENTRY: {
    titleKey: "finance.posting.single.title",
    createPath: "/finance/posting/single-entry/init",
    createKey: "finance.posting.action.create",
  },
  DOUBLE_ENTRY: {
    titleKey: "finance.posting.double.title",
    createPath: "/finance/posting/double-entry/init",
    createKey: "finance.posting.action.create",
  },
  OFF_BALANCE: {
    titleKey: "finance.posting.off_balance.title",
    createPath: "/finance/posting/off-balance/init",
    createKey: "finance.posting.off_balance.action.create",
  },
  CANCELLATION: {
    titleKey: "finance.posting.cancellation.title",
    createPath: "/finance/posting/cancellation/init",
    createKey: "finance.posting.cancellation.action.create",
  },
  CLOSING: {
    titleKey: "finance.posting.closing.title",
    createPath: "/finance/posting/closing/init",
    createKey: "finance.posting.closing.action.create",
  },
}

/**
 * Shared list controller for the manual posting screens (bút toán lẻ /
 * bút toán kép / ngoại bảng / hủy giao dịch / kết chuyển): server-tier list
 * over the journal endpoint pinned to one document_type, status tabs with
 * counts, a row quick view (RecordSheet) and a "create" action that
 * navigates to the flow's init route.
 */
export function PostingCaseListPage({
  flow,
  documentType,
}: {
  flow: PostingFlow
  documentType: string
}) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [importOpen, setImportOpen] = useState(false)

  const meta = FLOW_META[flow]
  const titleKey = meta.titleKey
  const canImport = flow === "SINGLE_ENTRY" || flow === "DOUBLE_ENTRY"
  // One cache entry per flow: the five lists share the list definition.
  const queryKey = useMemo(() => [...postingListDefinition.queryKey, documentType], [documentType])

  const statusLabels = useMemo<Record<string, string>>(
    () =>
      Object.fromEntries(
        POSTING_STATUSES.map((status) => [
          status,
          t(`finance.fund_task_form.status.${status.toLowerCase()}`),
        ])
      ),
    [t]
  )

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
          <DataTableColumnHeader
            column={column}
            label={t("finance.journal.field.accounting_date")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {formatDateShort(row.original.accounting_date)}
          </span>
        ),
      },
      {
        id: "document_code",
        accessorKey: "document_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("finance.posting.col.document_code")} />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.document_code || "—"}</span>
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
          <StatusBadge status={row.original.status}>
            {statusLabels[row.original.status] ?? row.original.status}
          </StatusBadge>
        ),
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.created")} />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDateShort(row.original.created_at)}</span>
        ),
      },
    ],
    [statusLabels, t]
  )

  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
  } = useServerDataTable<JournalEntry>({
    ...postingListDefinition,
    queryKey,
    columns,
    queryFn: async (query) =>
      postingApi.listJournalPaged({
        page: query.page,
        perPage: query.perPage,
        document_type: documentType,
        status: postingStatusParam(query.status === undefined ? undefined : String(query.status)),
        sort: query.sort,
        order: query.order,
      }),
  })

  const sheet = useRecordSheet(table)
  const views = useMemo(
    () => [
      { id: "all", label: t("finance.posting.view.all") },
      ...POSTING_STATUSES.map((value) => ({ id: value, value, label: statusLabels[value] })),
    ],
    [statusLabels, t]
  )

  return (
    <>
      <ListPageShell
        title={t(titleKey)}
        totalRows={total}
        views={
          <SavedViewTabs
            views={views}
            urlKey="status"
            config={postingListDefinition.queryConfig}
            countKey={queryKey}
            countFn={(status) =>
              postingApi
                .listJournalPaged({
                  page: 1,
                  perPage: 1,
                  document_type: documentType,
                  status: postingStatusParam(status),
                })
                .then((res) => res.total)
            }
            aria-label={t("common.field.status")}
          />
        }
        onRowClick={sheet.openRow}
        activeRowId={sheet.activeRowId}
        dialogs={
          <PostingCaseSheet record={sheet.record} sheet={sheet} statusLabels={statusLabels} />
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
            exportFilename={t(titleKey)}
            sheetName={t(titleKey)}
            totalRowsCount={total}
          >
            {canImport && (
              <Button
                variant="outline"
                className="mr-1 h-8 px-3 text-xs font-semibold"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="mr-1 size-3.5" />
                {t("finance.posting.import.action")}
              </Button>
            )}
            <Button
              variant="outline"
              className="h-8 px-3 text-xs font-semibold"
              onClick={() => navigate(meta.createPath)}
            >
              <Plus className="mr-1 size-3.5" />
              {t(meta.createKey)}
            </Button>
          </ListTableToolbar>
        }
      />
      {canImport && (
        <ImportPostingDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          flow={flow}
          onImported={() => {
            void refetch()
          }}
        />
      )}
    </>
  )
}
