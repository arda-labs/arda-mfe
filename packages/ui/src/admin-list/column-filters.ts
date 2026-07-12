import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"

export function matchTextQuery(needle: string, ...values: Array<string | undefined | null>) {
  const q = needle.trim().toLowerCase()
  if (!q) return true
  return values.some((value) => value?.toLowerCase().includes(q))
}

export function textSearchMeta(label: string, placeholder: string) {
  return {
    label,
    variant: "text" as const,
    placeholder,
  }
}

export function activeStatusMeta(
  label: string,
  activeLabel: string,
  inactiveLabel: string
) {
  return {
    label,
    variant: "multiSelect" as const,
    options: [
      { label: activeLabel, value: "true" },
      { label: inactiveLabel, value: "false" },
    ],
  }
}

export function selectFilterMeta(
  label: string,
  options: Array<{ label: string; value: string }>
) {
  return {
    label,
    variant: "select" as const,
    options,
  }
}

export function multiSelectFilterMeta(
  label: string,
  options: Array<{ label: string; value: string }>
) {
  return {
    label,
    variant: "multiSelect" as const,
    options,
  }
}

export function getFilterableColumns<T>(columns: ColumnDef<T>[]) {
  return columns.filter((column) => column.enableColumnFilter)
}

export type ColumnFilterValues = Record<string, string | string[] | null>

/** Reads table-managed filters; `useDataTable` is the sole URL writer. */
export function useColumnFilterParams<T>(columns: ColumnDef<T>[]) {
  const [searchParams] = useSearchParams()
  const filterableColumns = useMemo(() => getFilterableColumns(columns), [columns])
  const values = useMemo(() => {
    return filterableColumns.reduce<ColumnFilterValues>((result, column) => {
      const id = column.id
      if (!id) return result
      const raw = searchParams.get(id)
      result[id] = column.meta?.options
        ? raw?.split(",").filter(Boolean) ?? []
        : raw ?? ""
      return result
    }, {})
  }, [filterableColumns, searchParams])

  return [values] as const
}

export function getTextFilterValue(value: string | string[] | null | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === "string" ? raw.trim() : ""
}

export function getSingleSelectValue(value: string | string[] | null | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : []
  return values.length === 1 ? values[0] : undefined
}

export function matchTextColumnFilter(
  value: string | string[],
  ...fields: Array<string | undefined | null>
) {
  const needle = Array.isArray(value) ? value[0] ?? "" : value
  return matchTextQuery(needle, ...fields)
}

export function matchBooleanActiveFilter(
  item: { is_active: boolean },
  value: string | string[]
) {
  const selected = getSingleSelectValue(value)
  if (!selected) return true
  return item.is_active === (selected === "true")
}

export function matchStringFieldFilter(itemValue: string, value: string | string[]) {
  const selected = getSingleSelectValue(value)
  if (!selected) return true
  return itemValue === selected
}

export function matchSelectFilter(itemValue: string, value: string | string[]) {
  const values = Array.isArray(value) ? value : value ? [value] : []
  if (values.length === 0) return true
  return values.includes(itemValue)
}
