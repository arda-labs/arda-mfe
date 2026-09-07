import type { ReactNode } from "react"
import type { Table as TanstackTable } from "@tanstack/react-table"
import type { ColumnDef } from "@tanstack/react-table"
import { useQuery } from "@tanstack/react-query"
import {
  matchSelectFilter,
  matchTextColumnFilter,
} from "@workspace/list-page/column-filters"
import {
  sortByColumn,
  useClientListTable,
} from "@workspace/list-page/client-list"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { useI18n } from "@workspace/i18n"
import { workflowApi, type WorkflowCaseType } from "../../api"

/** Select option shape shared by the workflow admin dialogs. */
export type CatalogSelectOption = {
  value: string
  label: string
  description?: string
}

/** Slot contract each process-roles tab fills in for the outer shell. */
export type ProcessRolesTab = {
  key: string
  /** TanStack Table is invariant in TData; each tab holds a differently-typed table. */
  table: TanstackTable<any>
  toolbar: ReactNode
  dialogs: ReactNode
  criticalPending: boolean
  criticalError: unknown
  onRetry: () => void
  fetching: boolean
  total: number
  countLabel: string
}

export type TabSortFields<T> = Record<string, (a: T, b: T) => number>

export function byString<T>(get: (item: T) => string) {
  return (a: T, b: T) => get(a).localeCompare(get(b))
}

export function byNumber<T>(get: (item: T) => number) {
  return (a: T, b: T) => get(a) - get(b)
}

/**
 * Client-tier list wiring for one tab: eager fetch-all query (tables are
 * small lookups) + URL-synced client filters/sort/pagination. The query owns
 * this tab's error state — tabs never share or reset each other's state.
 */
export function useTabList<T>({
  queryKey,
  queryFn,
  enabled = true,
  columns,
  textFilterId,
  textFields,
  statusFilterId,
  sortFields,
}: {
  queryKey: unknown[]
  queryFn: () => Promise<T[]>
  enabled?: boolean
  columns: ColumnDef<T>[]
  textFilterId: string
  textFields: (item: T) => Array<string | undefined | null>
  statusFilterId: string
  sortFields: TabSortFields<T>
}) {
  const query = useQuery({
    queryKey,
    queryFn,
    enabled,
  })
  const items = query.data ?? []
  const { table, total } = useClientListTable<T>({
    columns,
    items,
    filterBy: {
      [textFilterId]: (item: T, value: string | string[]) =>
        matchTextColumnFilter(value, ...textFields(item)),
      [statusFilterId]: (item: T, value: string | string[]) =>
        matchSelectFilter((item as { status?: string }).status ?? "", value),
    },
    sort: (rows, sortState) => sortByColumn(rows, sortState, sortFields),
    defaultPageSize: 10,
  })
  return { query, items, table, total }
}

export function WorkflowStatusCell({ status }: { status: string }) {
  return (
    <Status variant={status === "ACTIVE" ? "success" : "default"}>
      <StatusIndicator />
      <StatusLabel>{status || "-"}</StatusLabel>
    </Status>
  )
}

export function statusFilterOptions(
  t: ReturnType<typeof useI18n>["t"]
): Array<{ label: string; value: string }> {
  return [
    { label: t("workflow.status.active"), value: "ACTIVE" },
    { label: t("workflow.status.draft"), value: "DRAFT" },
    { label: t("workflow.status.inactive"), value: "INACTIVE" },
  ]
}

/** Case type options shared by the assignment and mapping dialogs. */
export function useCaseTypesLookup() {
  return useQuery({
    queryKey: ["workflow", "case-types", "all"],
    queryFn: () => workflowApi.listCaseTypes(),
  })
}

export function caseTypeOptionsOf(
  items: WorkflowCaseType[]
): CatalogSelectOption[] {
  return items.map((item) => ({
    value: item.caseType,
    label: `${item.caseType} - ${item.operationName}`,
    description: item.businessArea,
  }))
}
