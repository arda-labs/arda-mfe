import { flexRender } from "@tanstack/react-table";
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
import { cn } from "@workspace/ui/lib/utils";

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
  table: TanstackTable<TData>;
  actionBar?: React.ReactNode;
  defaultDensity?: DataTableDensity;
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
    head: "h-9 px-3 text-xs",
    cell: "px-3 py-2 text-xs",
    empty: "h-20 px-3 py-2 text-center text-xs",
  },
  comfortable: {
    head: "h-10 px-3 text-sm",
    cell: "px-3 py-2.5 text-sm",
    empty: "h-24 px-3 py-2.5 text-center text-sm",
  },
  spacious: {
    head: "h-12 px-4 text-sm",
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
  ...props
}: DataTableProps<TData>) {
  const [density, setDensity] =
    React.useState<DataTableDensity>(defaultDensity);
  const densityClass = densityStyles[density];

  return (
    <DataTableDensityContext.Provider
      value={React.useMemo(
        () => ({ density, setDensity }),
        [density],
      )}
    >
      <div
        className={cn("flex w-full flex-col gap-2.5 overflow-auto", className)}
        {...props}
      >
        {children}
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={densityClass.head}
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
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={densityClass.cell}
                        style={{
                          ...getColumnPinningStyle({ column: cell.column }),
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
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
        <div className="flex flex-col gap-2.5">
          <DataTablePagination table={table} />
          {actionBar &&
            table.getFilteredSelectedRowModel().rows.length > 0 &&
            actionBar}
        </div>
      </div>
    </DataTableDensityContext.Provider>
  );
}
