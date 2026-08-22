import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import { listPageCount } from "@workspace/api/list"
import { useDataTable } from "@workspace/admin-list/use-data-table"
import { parseSortingState } from "@workspace/ui/lib/parsers"

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

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function useClientListTable<T>({
  columns,
  items,
  filterBy,
  sort,
  defaultPageSize = 10,
}: UseClientListTableOptions<T>) {
  const [searchParams] = useSearchParams()
  const columnIds = useMemo(
    () =>
      new Set(columns.map((column) => column.id).filter(Boolean) as string[]),
    [columns]
  )
  const page = positiveInteger(searchParams.get("page"), 1)
  const perPage = positiveInteger(searchParams.get("perPage"), defaultPageSize)
  const sortParam = searchParams.get("sort")
  const sorting = useMemo(
    () => parseSortingState<T>(sortParam, columnIds),
    [columnIds, sortParam]
  )
  const filterValues = useMemo(() => {
    return columns.reduce<Record<string, string | string[] | null>>(
      (values, column) => {
        const id = column.id
        if (!id || !column.enableColumnFilter) return values
        const raw = searchParams.get(id)
        values[id] = column.meta?.options
          ? (raw?.split(",").filter(Boolean) ?? [])
          : (raw ?? "")
        return values
      },
      {}
    )
  }, [columns, searchParams])

  const filtered = useMemo(() => {
    let result = items

    if (filterBy) {
      for (const [key, handler] of Object.entries(filterBy)) {
        const value = filterValues[key]
        if (!hasFilterValue(value)) continue
        result = result.filter((item) =>
          handler(item, Array.isArray(value) ? value : String(value))
        )
      }
    }

    if (sort && sorting.length > 0) result = sort(result, sorting)
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

export function sortByColumn<T>(
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
