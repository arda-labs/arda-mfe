import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { parseAsInteger, useQueryState } from "nuqs"
import { listPageCount } from "@workspace/core/http/list-api"
import { useDataTable } from "@workspace/ui/hooks/use-data-table"
import { getSortingStateParser } from "@workspace/ui/lib/parsers"
import { useColumnFilterParams } from "./column-filters"

type SortState = { id: string; desc: boolean }[]

type UseClientListTableOptions<T> = {
  columns: ColumnDef<T>[]
  items: T[]
  filterBy?: Record<string, (item: T, value: string | string[]) => boolean>
  sort?: (items: T[], sorting: SortState) => T[]
  defaultPageSize?: number
}

function hasFilterValue(value: string | string[] | null | undefined) {
  if (value == null) return false
  if (Array.isArray(value)) return value.length > 0
  return value.trim().length > 0
}

export function useClientListTable<T>({
  columns,
  items,
  filterBy,
  sort,
  defaultPageSize = 10,
}: UseClientListTableOptions<T>) {
  const columnIds = useMemo(
    () => new Set(columns.map((column) => column.id).filter(Boolean) as string[]),
    [columns]
  )

  const [page] = useQueryState("page", parseAsInteger.withDefault(1))
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(defaultPageSize))
  const [sorting] = useQueryState(
    "sort",
    getSortingStateParser<T>(columnIds).withDefault([])
  )
  const [filterValues] = useColumnFilterParams(columns)

  const filtered = useMemo(() => {
    let result = items

    if (filterBy) {
      for (const [key, handler] of Object.entries(filterBy)) {
        const value = filterValues[key]
        if (!hasFilterValue(value)) continue
        const normalized = Array.isArray(value) ? value : String(value)
        result = result.filter((item) => handler(item, normalized))
      }
    }

    if (sort && sorting.length > 0) {
      result = sort(result, sorting)
    }

    return result
  }, [filterBy, filterValues, items, sort, sorting])

  const total = filtered.length
  const pageCount = listPageCount(total, perPage)
  const paged = useMemo(() => {
    const start = (page - 1) * perPage
    return filtered.slice(start, start + perPage)
  }, [filtered, page, perPage])

  const { table } = useDataTable<T>({
    columns,
    data: paged,
    pageCount,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: defaultPageSize,
      },
    },
  })

  return { table, total, paged }
}

export function sortByColumn<T extends Record<string, unknown>>(
  items: T[],
  sorting: SortState,
  fields: Record<string, (a: T, b: T) => number>
) {
  if (sorting.length === 0) return items
  const { id, desc } = sorting[0]
  const compare = fields[id]
  if (!compare) return items
  const direction = desc ? -1 : 1
  return [...items].sort((a, b) => compare(a, b) * direction)
}
