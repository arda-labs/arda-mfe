import { flexRender, type Row } from "@tanstack/react-table"
import type { Table as TanstackTable } from "@tanstack/react-table"
import * as React from "react"

import { DataTablePagination } from "@workspace/ui/components/data-table/data-table-pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { getColumnPinningStyle } from "@workspace/ui/lib/data-table"
import { utilityTableColumnClassName } from "@workspace/ui/lib/inject-row-index-column"
import { cn } from "@workspace/ui/lib/utils"

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
  table: TanstackTable<TData>
  actionBar?: React.ReactNode
  defaultDensity?: DataTableDensity
  /** `panel` — toolbar + pagination fixed; only table body scrolls. */
  layout?: "default" | "panel"
  /** Double-click row to open detail (skipped on buttons/links/checkboxes). */
  onRowDoubleClick?: (row: Row<TData>) => void
  /** Dim rows while a background list refetch is in progress. */
  fetching?: boolean
  /** Adds a semantic class to a row without coupling the table to domain data. */
  rowClassName?: (row: Row<TData>) => string | undefined
}

export type DataTableDensity = "compact" | "comfortable" | "spacious"

interface DataTableDensityContextValue {
  density: DataTableDensity
  setDensity: (density: DataTableDensity) => void
}

const DataTableDensityContext =
  React.createContext<DataTableDensityContextValue | null>(null)

const densityStyles: Record<
  DataTableDensity,
  { head: string; cell: string; empty: string }
> = {
  compact: {
    head: "h-9 px-3 text-xs font-bold text-foreground",
    cell: "px-3 py-2 text-xs",
    empty: "h-20 px-3 py-2 text-center text-xs",
  },
  comfortable: {
    head: "h-10 px-3 text-sm font-bold text-foreground",
    cell: "px-3 py-2.5 text-sm",
    empty: "h-24 px-3 py-2.5 text-center text-sm",
  },
  spacious: {
    head: "h-12 px-4 text-sm font-bold text-foreground",
    cell: "p-4 text-sm",
    empty: "h-24 p-4 text-center text-sm",
  },
}

export function useDataTableDensity() {
  const context = React.useContext(DataTableDensityContext)

  return (
    context ?? {
      density: "compact" as const,
      setDensity: () => {},
    }
  )
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  className,
  defaultDensity = "compact",
  layout = "default",
  onRowDoubleClick,
  fetching = false,
  rowClassName,
  ...props
}: DataTableProps<TData>) {
  const [density, setDensity] = React.useState<DataTableDensity>(defaultDensity)
  const densityClass = densityStyles[density]
  const isPanel = layout === "panel"
  const headerScrollRef = React.useRef<HTMLDivElement>(null)
  const tableWidth = Math.max(table.getTotalSize(), 0)

  const syncHeaderScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (headerScrollRef.current) {
        headerScrollRef.current.scrollLeft = event.currentTarget.scrollLeft
      }
    },
    []
  )

  const colGroup = (
    <colgroup>
      {table.getVisibleLeafColumns().map((column) => (
        <col key={column.id} style={{ width: column.getSize() }} />
      ))}
    </colgroup>
  )

  const headerRows = table.getHeaderGroups().map((headerGroup) => (
    <TableRow
      key={headerGroup.id}
      className={cn(isPanel && "border-b-0 hover:bg-transparent")}
    >
      {headerGroup.headers.map((header) => (
        <TableHead
          key={header.id}
          colSpan={header.colSpan}
          className={cn(
            densityClass.head,
            utilityTableColumnClassName(header.column.id),
            isPanel && "bg-muted/80 text-foreground/90"
          )}
          style={getColumnPinningStyle({ column: header.column })}
        >
          {header.isPlaceholder
            ? null
            : flexRender(header.column.columnDef.header, header.getContext())}
        </TableHead>
      ))}
    </TableRow>
  ))

  const bodyRows = table.getRowModel().rows.length ? (
    table.getRowModel().rows.map((row) => {
      const isStriped = row.index % 2 === 1

      return (
        <TableRow
          key={row.id}
          data-state={row.getIsSelected() && "selected"}
          className={cn(
            isStriped && "bg-table-row-stripe hover:bg-accent/65",
            !isStriped && "hover:bg-accent/45",
            onRowDoubleClick && "cursor-default",
            rowClassName?.(row)
          )}
          onDoubleClick={
            onRowDoubleClick
              ? (event) => {
                  const target = event.target as HTMLElement
                  if (
                    target.closest(
                      "button, a, [role='checkbox'], input, select, textarea"
                    )
                  ) {
                    return
                  }
                  onRowDoubleClick(row)
                }
              : undefined
          }
        >
          {row.getVisibleCells().map((cell) => (
            <TableCell
              key={cell.id}
              className={cn(
                densityClass.cell,
                utilityTableColumnClassName(cell.column.id),
                isStriped && "bg-table-row-stripe"
              )}
              style={{
                ...getColumnPinningStyle({ column: cell.column }),
                ...(cell.column.getIsPinned() && isStriped
                  ? { background: "var(--table-row-stripe)" }
                  : {}),
              }}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          ))}
        </TableRow>
      )
    })
  ) : (
    <TableRow>
      <TableCell
        colSpan={table.getAllColumns().length}
        className={densityClass.empty}
      >
        No results.
      </TableCell>
    </TableRow>
  )

  const tableClassName = cn(
    "w-full table-fixed border-separate border-spacing-0"
  )

  return (
    <DataTableDensityContext.Provider
      value={React.useMemo(() => ({ density, setDensity }), [density])}
    >
      <div
        className={cn(
          "flex w-full flex-col gap-2.5",
          isPanel ? "min-h-0 flex-1" : "overflow-auto",
          className
        )}
        {...props}
      >
        {children}
        <div
          className={cn(
            "flex flex-col overflow-hidden rounded-lg border bg-card shadow-card transition-opacity",
            isPanel ? "min-h-0 flex-1" : "",
            fetching && "opacity-60"
          )}
        >
          {isPanel ? (
            <>
              <div
                ref={headerScrollRef}
                className="shrink-0 border-b bg-muted/80 [scrollbar-width:none] overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden"
              >
                <table
                  className={tableClassName}
                  style={{ width: tableWidth, minWidth: "100%" }}
                >
                  {colGroup}
                  <TableHeader className="[&_tr]:border-b-0">
                    {headerRows}
                  </TableHeader>
                </table>
              </div>
              <div
                className="min-h-0 flex-1 overflow-auto"
                onScroll={syncHeaderScroll}
              >
                <table
                  className={tableClassName}
                  style={{ width: tableWidth, minWidth: "100%" }}
                >
                  {colGroup}
                  <TableBody>{bodyRows}</TableBody>
                </table>
              </div>
            </>
          ) : (
            <div className="overflow-x-auto">
              <Table
                className={tableClassName}
                containerClassName="overflow-visible"
              >
                <TableHeader>{headerRows}</TableHeader>
                <TableBody>{bodyRows}</TableBody>
              </Table>
            </div>
          )}
          <div className="shrink-0 border-t bg-muted/35 px-3 py-2">
            <DataTablePagination table={table} className="p-0" />
            {actionBar &&
              table.getFilteredSelectedRowModel().rows.length > 0 &&
              actionBar}
          </div>
        </div>
      </div>
    </DataTableDensityContext.Provider>
  )
}
