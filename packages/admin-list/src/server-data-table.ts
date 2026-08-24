import type { ColumnDef } from "@tanstack/react-table"
import { listPageCount } from "@workspace/api/list"
import {
  useServerList,
  useServerListQuery,
  type ServerListDefinition,
  type ServerListQueryFn,
} from "./server-list"
import { useDataTable, type UseDataTableProps } from "./use-data-table"

type UseServerDataTableOptions<TItem> = ServerListDefinition & {
  columns: ColumnDef<TItem>[]
  queryFn: ServerListQueryFn<TItem>
  enabled?: boolean
  staleTime?: number
  tableOptions?: Omit<
    UseDataTableProps<TItem>,
    "columns" | "data" | "pageCount"
  >
}

/** UI integration: one controller for server data and TanStack Table state. */
export function useServerDataTable<TItem>({
  queryKey,
  queryConfig,
  columns,
  queryFn,
  enabled,
  staleTime,
  tableOptions,
}: UseServerDataTableOptions<TItem>) {
  const query = useServerListQuery(queryConfig)
  const list = useServerList({ queryKey, query, queryFn, enabled, staleTime })
  const pageCount = listPageCount(list.total, list.perPage)
  const tableState = useDataTable<TItem>({
    ...tableOptions,
    columns,
    data: list.items,
    pageCount,
    queryKeys: {
      ...tableOptions?.queryKeys,
      page: queryConfig.queryKeys?.page ?? tableOptions?.queryKeys?.page,
      perPage:
        queryConfig.queryKeys?.perPage ?? tableOptions?.queryKeys?.perPage,
      sort: queryConfig.queryKeys?.sort ?? tableOptions?.queryKeys?.sort,
    },
    initialState: {
      ...tableOptions?.initialState,
      pagination: tableOptions?.initialState?.pagination ?? {
        pageIndex: 0,
        pageSize: queryConfig.defaultPageSize ?? 20,
      },
    },
  })
  return { ...list, ...tableState, query, pageCount }
}
