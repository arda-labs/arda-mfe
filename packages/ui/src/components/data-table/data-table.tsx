import { flexRender, type Row } from "@tanstack/react-table";
import type { Table as TanstackTable } from "@tanstack/react-table";
import * as React from "react";

import { DataTablePagination } from "@workspace/ui/components/data-table/data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { getColumnPinningStyle } from "@workspace/ui/lib/data-table";
import { utilityTableColumnClassName } from "@workspace/ui/lib/inject-row-index-column";
import { cn } from "@workspace/ui/lib/utils";

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
  table: TanstackTable<TData>;
  actionBar?: React.ReactNode;
  defaultDensity?: DataTableDensity;
  /** `panel` — toolbar + pagination fixed; only table body scrolls. */
  layout?: "default" | "panel";
  /** Double-click row to open detail (skipped on buttons/links/checkboxes). */
  onRowDoubleClick?: (row: Row<TData>) => void;
}

export type DataTableDensity = "compact" | "comfortable" | "spacious";

interface DataTableDensityContextValue {
  density: DataTableDensity;
  setDensity: (density: DataTableDensity) => void;
}

const DataTableDensityContext =
  React.createContext<DataTableDensityContextValue | null>(null);

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
};

export function useDataTableDensity() {
  const context = React.useContext(DataTableDensityContext);

  return (
    context ?? {
      density: "compact" as const,
      setDensity: () => {},
    }
  );
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  className,
  defaultDensity = "compact",
  layout = "default",
  onRowDoubleClick,
  ...props
}: DataTableProps<TData>) {
  const [density, setDensity] =
    React.useState<DataTableDensity>(defaultDensity);
  const densityClass = densityStyles[density];
  const isPanel = layout === "panel";

  return (
    <DataTableDensityContext.Provider
      value={React.useMemo(
        () => ({ density, setDensity }),
        [density],
      )}
    >
      <div
        className={cn(
          "flex w-full flex-col gap-2.5",
          isPanel ? "min-h-0 flex-1" : "overflow-auto",
          className,
        )}
        {...props}
      >
        {children}
        <div
          className={cn(
            "flex flex-col overflow-hidden rounded-md border bg-background",
            isPanel ? "min-h-0 flex-1" : "",
          )}
        >
          <div className={cn(isPanel && "min-h-0 flex-1 overflow-auto")}>
            <Table className="table-fixed">
              <TableHeader
                className={cn(
                  isPanel && "sticky top-0 z-10 bg-muted/60 shadow-[0_1px_0_0_hsl(var(--border))]",
                )}
              >
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className={cn(
                      isPanel && "border-b-0 hover:bg-transparent",
                    )}
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        className={cn(
                          densityClass.head,
                          utilityTableColumnClassName(header.column.id),
                          isPanel && "bg-muted/60",
                        )}
                        style={{
                          ...getColumnPinningStyle({ column: header.column }),
                        }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => {
                    const isStriped = row.index % 2 === 1;

                    return (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className={cn(
                        isStriped && "bg-table-row-stripe hover:bg-muted/70",
                        !isStriped && "hover:bg-muted/40",
                        onRowDoubleClick && "cursor-default",
                      )}
                      onDoubleClick={
                        onRowDoubleClick
                          ? (event) => {
                              const target = event.target as HTMLElement;
                              if (
                                target.closest(
                                  "button, a, [role='checkbox'], input, select, textarea",
                                )
                              ) {
                                return;
                              }
                              onRowDoubleClick(row);
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
                            isStriped && "bg-table-row-stripe",
                          )}
                          style={{
                            ...getColumnPinningStyle({ column: cell.column }),
                            ...(cell.column.getIsPinned() && isStriped
                              ? { background: "var(--table-row-stripe)" }
                              : {}),
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    );
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
                )}
              </TableBody>
            </Table>
          </div>
          <div className="shrink-0 border-t bg-background px-3 py-2">
            <DataTablePagination table={table} className="p-0" />
            {actionBar &&
              table.getFilteredSelectedRowModel().rows.length > 0 &&
              actionBar}
          </div>
        </div>
      </div>
    </DataTableDensityContext.Provider>
  );
}
