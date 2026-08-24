import {
  type ColumnDef,
  type ColumnFiltersState,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
  type TableState,
  type Updater,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table"
import { useSearchParams } from "react-router-dom"
import * as React from "react"

import { useDebouncedCallback } from "@workspace/ui/hooks/use-debounced-callback"
import { parseSortingState } from "@workspace/ui/lib/parsers"
import {
  injectRowIndexColumn,
  normalizeSelectColumn,
} from "@workspace/ui/lib/inject-row-index-column"
import type {
  ExtendedColumnSort,
  QueryKeys,
} from "@workspace/ui/types/data-table"
import { parsePositiveInteger } from "./list-url"

const PAGE_KEY = "page"
const PER_PAGE_KEY = "perPage"
const SORT_KEY = "sort"
const FILTERS_KEY = "filters"
const JOIN_OPERATOR_KEY = "joinOperator"
const ARRAY_SEPARATOR = ","
const DEBOUNCE_MS = 300
const TEXT_FILTER_VARIANTS = new Set(["text", "number"])

type FilterValues = Record<string, string | string[] | null>

function shouldDebounceFilterChange<TData>(
  previous: ColumnFiltersState,
  next: ColumnFiltersState,
  filterableColumns: ColumnDef<TData, unknown>[]
): boolean {
  for (const previousFilter of previous) {
    if (!next.some((filter) => filter.id === previousFilter.id)) return false
  }

  for (const filter of next) {
    const variant = filterableColumns.find((column) => column.id === filter.id)
      ?.meta?.variant
    if (variant && !TEXT_FILTER_VARIANTS.has(variant)) return false

    const values = Array.isArray(filter.value)
      ? filter.value.map(String)
      : filter.value
        ? [String(filter.value)]
        : []
    if (!values.some((value) => value.trim().length > 0)) return false
  }

  return true
}

export interface UseDataTableProps<TData>
  extends
    Omit<
      TableOptions<TData>,
      | "state"
      | "pageCount"
      | "getCoreRowModel"
      | "manualFiltering"
      | "manualPagination"
      | "manualSorting"
    >,
    Required<Pick<TableOptions<TData>, "pageCount">> {
  initialState?: Omit<Partial<TableState>, "sorting"> & {
    sorting?: ExtendedColumnSort<TData>[]
  }
  queryKeys?: Partial<QueryKeys>
  debounceMs?: number
  enableAdvancedFilter?: boolean
  /** Prepends row index column (STT). Default true. Placed after `select` when present. */
  showRowIndex?: boolean
  rowIndexLabel?: string
}

export function useDataTable<TData>(props: UseDataTableProps<TData>) {
  const {
    columns: inputColumns,
    pageCount = -1,
    initialState,
    queryKeys,
    debounceMs = DEBOUNCE_MS,
    enableAdvancedFilter = false,
    showRowIndex = true,
    rowIndexLabel = "STT",
    ...tableProps
  } = props
  const [searchParams, setSearchParams] = useSearchParams()
  const pageKey = queryKeys?.page ?? PAGE_KEY
  const perPageKey = queryKeys?.perPage ?? PER_PAGE_KEY
  const sortKey = queryKeys?.sort ?? SORT_KEY
  const filtersKey = queryKeys?.filters ?? FILTERS_KEY
  const joinOperatorKey = queryKeys?.joinOperator ?? JOIN_OPERATOR_KEY
  const defaultPerPage = initialState?.pagination?.pageSize ?? 10
  const page = parsePositiveInteger(searchParams.get(pageKey), 1)
  const perPage = parsePositiveInteger(
    searchParams.get(perPageKey),
    defaultPerPage
  )

  const updateSearch = React.useCallback(
    (update: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams)
      update(next)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
    initialState?.rowSelection ?? {}
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialState?.columnVisibility ?? {})

  const pagination: PaginationState = React.useMemo(
    () => ({ pageIndex: page - 1, pageSize: perPage }),
    [page, perPage]
  )

  const onPaginationChange = React.useCallback(
    (updaterOrValue: Updater<PaginationState>) => {
      const next =
        typeof updaterOrValue === "function"
          ? updaterOrValue(pagination)
          : updaterOrValue

      updateSearch((params) => {
        params.set(pageKey, String(next.pageIndex + 1))
        params.set(perPageKey, String(next.pageSize))
      })
    },
    [pageKey, pagination, perPageKey, updateSearch]
  )

  const columnIds = React.useMemo(
    () =>
      new Set(
        inputColumns.map((column) => column.id).filter(Boolean) as string[]
      ),
    [inputColumns]
  )
  const sorting = React.useMemo(
    () => parseSortingState<TData>(searchParams.get(sortKey), columnIds),
    [columnIds, searchParams, sortKey]
  )

  const onSortingChange = React.useCallback(
    (updaterOrValue: Updater<SortingState>) => {
      const next =
        typeof updaterOrValue === "function"
          ? updaterOrValue(sorting)
          : updaterOrValue

      updateSearch((params) => {
        if (next.length === 0) params.delete(sortKey)
        else params.set(sortKey, JSON.stringify(next))
        params.set(pageKey, "1")
      })
    },
    [pageKey, sorting, sortKey, updateSearch]
  )

  const filterableColumns = React.useMemo(
    () =>
      enableAdvancedFilter
        ? []
        : inputColumns.filter((column) => column.enableColumnFilter),
    [enableAdvancedFilter, inputColumns]
  )
  const filterValues = React.useMemo<FilterValues>(() => {
    const values: FilterValues = {}
    for (const column of filterableColumns) {
      const id = column.id
      if (!id) continue
      const raw = searchParams.get(id)
      values[id] = column.meta?.options
        ? (raw?.split(ARRAY_SEPARATOR).filter(Boolean) ?? [])
        : (raw ?? "")
    }
    return values
  }, [filterableColumns, searchParams])

  const initialColumnFilters = React.useMemo<ColumnFiltersState>(() => {
    if (enableAdvancedFilter) return []

    return Object.entries(filterValues).flatMap(([id, value]) => {
      if (
        value == null ||
        (Array.isArray(value) && value.length === 0) ||
        value === ""
      ) {
        return []
      }
      return [{ id, value }]
    })
  }, [enableAdvancedFilter, filterValues])
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>(initialColumnFilters)

  React.useEffect(() => {
    setColumnFilters(initialColumnFilters)
  }, [initialColumnFilters])

  const writeFilters = React.useCallback(
    (values: FilterValues) => {
      updateSearch((params) => {
        params.set(pageKey, "1")
        for (const column of filterableColumns) {
          const id = column.id
          if (!id) continue
          const value = values[id]
          const serialized = Array.isArray(value)
            ? value.filter(Boolean).join(ARRAY_SEPARATOR)
            : (value?.trim() ?? "")
          if (serialized) params.set(id, serialized)
          else params.delete(id)
        }
      })
    },
    [filterableColumns, pageKey, updateSearch]
  )

  const debouncedWriteFilters = useDebouncedCallback(writeFilters, debounceMs)

  const onColumnFiltersChange = React.useCallback(
    (updaterOrValue: Updater<ColumnFiltersState>) => {
      if (enableAdvancedFilter) return

      setColumnFilters((previous) => {
        const next =
          typeof updaterOrValue === "function"
            ? updaterOrValue(previous)
            : updaterOrValue
        const updates: FilterValues = {}

        for (const column of filterableColumns) {
          const id = column.id
          if (!id) continue
          const filter = next.find((item) => item.id === id)
          updates[id] = filter ? (filter.value as string | string[]) : null
        }

        if (shouldDebounceFilterChange(previous, next, filterableColumns)) {
          debouncedWriteFilters(updates)
        } else {
          debouncedWriteFilters.cancel()
          writeFilters(updates)
        }
        return next
      })
    },
    [
      debouncedWriteFilters,
      enableAdvancedFilter,
      filterableColumns,
      writeFilters,
    ]
  )

  const columns = React.useMemo(() => {
    const normalized = normalizeSelectColumn(inputColumns)
    if (!showRowIndex) return normalized
    return injectRowIndexColumn(normalized, {
      pageIndex: pagination.pageIndex,
      pageSize: pagination.pageSize,
      label: rowIndexLabel,
    })
  }, [
    inputColumns,
    pagination.pageIndex,
    pagination.pageSize,
    rowIndexLabel,
    showRowIndex,
  ])

  const table = useReactTable({
    ...tableProps,
    columns,
    initialState,
    pageCount,
    state: {
      pagination,
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    defaultColumn: {
      ...tableProps.defaultColumn,
      enableColumnFilter: false,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    meta: {
      ...tableProps.meta,
      queryKeys: {
        page: pageKey,
        perPage: perPageKey,
        sort: sortKey,
        filters: filtersKey,
        joinOperator: joinOperatorKey,
      },
    },
  })

  return React.useMemo(
    () => ({ table, page, perPage, sorting, filterValues }),
    [filterValues, page, perPage, sorting, table]
  )
}
