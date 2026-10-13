import type * as React from "react"
import type { Table } from "@tanstack/react-table"
import { Inbox, SearchX } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"

export type DataTableEmptyState = {
  title?: string
  description?: string
  /** Shown only when the list is genuinely empty (e.g. "Thêm phòng ban"). */
  action?: React.ReactNode
}

export function isDataTableFiltered<TData>(table: Table<TData>) {
  const state = table.getState()
  return state.columnFilters.length > 0 || Boolean(state.globalFilter)
}

/**
 * Two empty states (design board 01/16): "nothing yet" invites the first
 * record, "no match" offers to clear the filters. One message for both used
 * to read "no results" even on a brand-new, empty catalog.
 */
export function DataTableEmpty<TData>({
  table,
  emptyState,
}: {
  table: Table<TData>
  emptyState?: DataTableEmptyState
}) {
  const { t } = useI18n()
  const filtered = isDataTableFiltered(table)
  const Icon = filtered ? SearchX : Inbox

  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold">
          {filtered
            ? t("common.table.filtered_empty_title")
            : (emptyState?.title ?? t("common.table.empty_title"))}
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {filtered
            ? t("common.table.filtered_empty_description")
            : (emptyState?.description ?? t("common.table.empty_description"))}
        </p>
      </div>
      {filtered ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            table.resetColumnFilters()
            table.resetGlobalFilter()
          }}
        >
          {t("common.action.clear_filters")}
        </Button>
      ) : (
        emptyState?.action
      )}
    </div>
  )
}
