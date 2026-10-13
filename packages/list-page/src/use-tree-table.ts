import { useMemo, useState } from "react"
import {
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ExpandedState,
  type SortingState,
  type Updater,
  type VisibilityState,
} from "@tanstack/react-table"
import { buildTree, expandedToDepth } from "./tree"

type UseTreeTableOptions<TData> = {
  /** The whole (small, near-static) catalog, flat. */
  items: TData[]
  columns: ColumnDef<TData>[]
  getId: (item: TData) => string
  getParentId: (item: TData) => string | null | undefined
  /** Sibling order (e.g. by code). */
  compare?: (a: TData, b: TData) => number
  /** Levels open on first render (1 = roots show their children). */
  defaultExpandedDepth?: number
}

const resolve = <T,>(updater: Updater<T>, previous: T) =>
  typeof updater === "function" ? (updater as (old: T) => T)(previous) : updater

/**
 * Client tree over a flat catalog with parent ids (design board 09,
 * TreeTable): org structure, chart of accounts, areas. Filters keep the
 * ancestors of every match and open the tree while a filter is active; the
 * whole tree is one page, so pagination stays hidden.
 */
export function useTreeTable<TData>({
  items,
  columns,
  getId,
  getParentId,
  compare,
  defaultExpandedDepth = 1,
}: UseTreeTableOptions<TData>) {
  const { roots, children } = useMemo(
    () => buildTree(items, getId, getParentId, compare),
    [items, getId, getParentId, compare]
  )
  const defaultExpanded = useMemo(
    () => expandedToDepth(roots, children, getId, defaultExpandedDepth),
    [roots, children, getId, defaultExpandedDepth]
  )
  // null = follow the default, so data arriving later still opens level 1.
  const [expandedOverride, setExpandedOverride] = useState<ExpandedState | null>(null)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const expanded = expandedOverride ?? defaultExpanded
  const filtering = columnFilters.some((filter) => filter.value !== "" && filter.value != null)

  const table = useReactTable({
    data: roots,
    columns,
    getRowId: (item) => getId(item),
    getSubRows: (item) => children.get(getId(item)),
    state: {
      expanded: filtering ? true : expanded,
      columnFilters,
      sorting,
      columnVisibility,
    },
    onExpandedChange: (updater) => setExpandedOverride(resolve(updater, expanded)),
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // A matching child keeps its whole branch visible.
    filterFromLeafRows: true,
    manualPagination: true,
    pageCount: 1,
    meta: { totalRows: items.length },
  })

  return {
    table,
    /** Rows in the tree, at any depth. */
    total: items.length,
    expandAll: () => setExpandedOverride(true),
    collapseAll: () => setExpandedOverride({}),
  }
}
