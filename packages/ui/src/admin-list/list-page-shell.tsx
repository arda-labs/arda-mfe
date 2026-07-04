import type { ReactNode } from "react"
import type { Row, Table as TanstackTable } from "@tanstack/react-table"
import { PageHeader } from "@workspace/ui/components/page-header"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { DataTableSkeleton } from "@workspace/ui/components/data-table/data-table-skeleton"

type ListPageShellProps<TData> = {
  title: string
  meta?: ReactNode
  actions?: ReactNode
  loading: boolean
  isEmpty: boolean
  skeletonColumns?: number
  skeletonFilters?: number
  table: TanstackTable<TData>
  toolbar?: ReactNode
  header?: ReactNode
  dialogs?: ReactNode
  onRowDoubleClick?: (row: Row<TData>) => void
}

export function ListPageShell<TData>({
  title,
  meta,
  actions,
  loading,
  isEmpty,
  skeletonColumns = 5,
  skeletonFilters = 1,
  table,
  toolbar,
  header,
  dialogs,
  onRowDoubleClick,
}: ListPageShellProps<TData>) {
  if (loading && isEmpty) {
    return (
      <section className="flex h-full min-h-0 flex-col gap-4 p-4">
        <PageHeader title={title} meta={meta} actions={actions} />
        {header}
        <DataTableSkeleton
          className="min-h-0 flex-1"
          columnCount={skeletonColumns}
          rowCount={10}
          filterCount={skeletonFilters}
        />
      </section>
    )
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 p-4">
      <PageHeader title={title} meta={meta} actions={actions} />
      {header}
      <DataTable
        layout="panel"
        table={table}
        className="min-h-0 flex-1"
        onRowDoubleClick={onRowDoubleClick}
      >
        {toolbar}
      </DataTable>
      {dialogs}
    </section>
  )
}
