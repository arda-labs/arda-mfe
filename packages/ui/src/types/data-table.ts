import type { ColumnSort, Row, RowData } from "@tanstack/react-table"
import type { DataTableConfig } from "@workspace/ui/config/data-table"
import type { FilterItemSchema } from "@workspace/ui/lib/parsers"

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    queryKeys?: QueryKeys
    totalRows?: number
    queryFn?: (query: any, ctx: { signal: AbortSignal }) => Promise<{ items: TData[]; total: number }>
    query?: Record<string, unknown>
  }

  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string
    title?: string
    placeholder?: string
    variant?: FilterVariant
    options?: Option[]
    range?: [number, number]
    unit?: string
    icon?: React.ComponentType<React.ComponentProps<"svg">>
    exportValue?: (item: TData, helpers?: any) => string | number | boolean | null
    exportType?: "text" | "number" | "date" | "currency" | "code"
  }
}

export interface QueryKeys {
  page: string
  perPage: string
  sort: string
  filters: string
  joinOperator: string
}

export interface Option {
  label: string
  value: string
  count?: number
  icon?: React.ComponentType<React.ComponentProps<"svg">>
}

export type FilterOperator = DataTableConfig["operators"][number]
export type FilterVariant = DataTableConfig["filterVariants"][number]
export type JoinOperator = DataTableConfig["joinOperators"][number]

export interface ExtendedColumnSort<TData> extends Omit<ColumnSort, "id"> {
  id: Extract<keyof TData, string>
}

export interface ExtendedColumnFilter<TData> extends FilterItemSchema {
  id: Extract<keyof TData, string>
}

export interface DataTableRowAction<TData> {
  row: Row<TData>
  variant: "update" | "delete"
}
