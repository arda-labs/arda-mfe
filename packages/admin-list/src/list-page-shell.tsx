import type { ReactNode } from "react"
import type { Row, Table as TanstackTable } from "@tanstack/react-table"
import { PageErrorDialog } from "./page-error-dialog"
import { PageLoadOverlay } from "./page-load-overlay"
import { PageHeader } from "@workspace/ui/components/page-header"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { FloatingBatchActionBar } from "@workspace/ui/components/data-table/floating-batch-action-bar"
import { useDelayedBusy } from "@workspace/ui/hooks/use-delayed-busy"

type ListPageShellProps<TData> = {
  title: string
  meta?: ReactNode
  totalRows?: number
  actions?: ReactNode
  /** Actions rendered inside the floating batch bar when rows are selected. */
  batchActions?: ReactNode | ((table: TanstackTable<TData>) => ReactNode)
  /** Critical APIs still loading on first paint (list + required lookups). */
  criticalPending: boolean
  /** Blocking load error when critical data never arrived. */
  criticalError?: unknown | null
  onRetry?: () => void
  loadErrorTitle?: string
  /** List refetch after filters/page change — regional table feedback only. */
  fetching?: boolean
  table: TanstackTable<TData>
  toolbar?: ReactNode
  header?: ReactNode
  dialogs?: ReactNode
  onRowDoubleClick?: (row: Row<TData>) => void
}

export function ListPageShell<TData>({
  title,
  meta,
  totalRows,
  actions,
  batchActions,
  criticalPending,
  criticalError = null,
  onRetry,
  loadErrorTitle,
  fetching = false,
  table,
  toolbar,
  header,
  dialogs,
  onRowDoubleClick,
}: ListPageShellProps<TData>) {
  const showOverlay = useDelayedBusy(criticalPending)
  const showErrorDialog = criticalError != null && !criticalPending

  return (
    <section className="flex h-full min-h-0 flex-col gap-5 overflow-hidden p-4 sm:p-5">
      <PageHeader title={title} meta={meta} actions={actions} />
      {header}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <DataTable
          layout="panel"
          table={table}
          totalRows={totalRows}
          className="min-h-0 flex-1"
          fetching={fetching}
          onRowDoubleClick={onRowDoubleClick}
        >
          {toolbar}
        </DataTable>
        {showOverlay ? <PageLoadOverlay /> : null}
        {batchActions ? (
          <FloatingBatchActionBar table={table}>
            {typeof batchActions === "function" ? batchActions(table) : batchActions}
          </FloatingBatchActionBar>
        ) : null}
      </div>
      <PageErrorDialog
        open={showErrorDialog}
        error={criticalError}
        onRetry={onRetry}
        title={loadErrorTitle}
      />
      {dialogs}
    </section>
  )
}
