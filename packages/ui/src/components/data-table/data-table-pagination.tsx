import type { Table } from "@tanstack/react-table"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"
import { SELECT_COLUMN_ID } from "@workspace/ui/lib/inject-row-index-column"
import { useI18n } from "@workspace/i18n"

interface DataTablePaginationProps<TData> extends React.ComponentProps<"div"> {
  table: Table<TData>
  totalRows?: number
  pageSizeOptions?: number[]
}

export function DataTablePagination<TData>({
  table,
  totalRows,
  pageSizeOptions = [10, 20, 30, 40, 50],
  className,
  ...props
}: DataTablePaginationProps<TData>) {
  const { t } = useI18n()
  const selectedRows = table.getFilteredSelectedRowModel().rows.length
  const hasSelectionColumn = table
    .getAllLeafColumns()
    .some((column) => column.id === SELECT_COLUMN_ID)
  const total = totalRows ?? table.getFilteredRowModel().rows.length

  return (
    <div
      className={cn(
        "flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto sm:flex-row sm:gap-8",
        className
      )}
      {...props}
    >
      <div className="flex-1 text-sm whitespace-nowrap text-muted-foreground">
        {t("common.pagination.total", { count: total })}
        {hasSelectionColumn && selectedRows > 0
          ? ` · ${t("common.pagination.selected", { count: selectedRows })}`
          : null}
      </div>
      <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium whitespace-nowrap">
            {t("common.pagination.rows_per_page")}
          </p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="h-8 w-18 data-size:h-8">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectGroup>
                {pageSizeOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-center text-sm font-medium">
          {t("common.pagination.page_of", {
            page: table.getState().pagination.pageIndex + 1,
            totalPages: table.getPageCount(),
          })}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            aria-label={t("common.pagination.first_page")}
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft />
          </Button>
          <Button
            aria-label={t("common.pagination.previous_page")}
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft />
          </Button>
          <Button
            aria-label={t("common.pagination.next_page")}
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight />
          </Button>
          <Button
            aria-label={t("common.pagination.last_page")}
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
