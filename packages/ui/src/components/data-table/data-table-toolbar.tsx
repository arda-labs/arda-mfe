"use client";

import type { Column, Table } from "@tanstack/react-table";
import { Check, SlidersHorizontal, XCircle } from "lucide-react";
import * as React from "react";

import { DataTableDateFilter } from "@workspace/ui/components/data-table/data-table-date-filter";
import { DataTableFacetedFilter } from "@workspace/ui/components/data-table/data-table-faceted-filter";
import { DataTableSliderFilter } from "@workspace/ui/components/data-table/data-table-slider-filter";
import { DataTableViewOptions } from "@workspace/ui/components/data-table/data-table-view-options";
import { useDataTableDensity } from "@workspace/ui/components/data-table/data-table";
import type { DataTableDensity } from "@workspace/ui/components/data-table/data-table";
import { Button } from "@workspace/ui/components/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";

interface DataTableToolbarProps<TData> extends React.ComponentProps<"div"> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({
  table,
  children,
  className,
  ...props
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  const columns = React.useMemo(
    () => table.getAllColumns().filter((column) => column.getCanFilter()),
    [table],
  );

  const onReset = React.useCallback(() => {
    table.resetColumnFilters();
  }, [table]);

  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn(
        "flex w-full items-center justify-between gap-2",
        className,
      )}
      {...props}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {columns.map((column) => (
          <DataTableToolbarFilter key={column.id} column={column} />
        ))}
        {isFiltered && (
          <Button
            aria-label="Reset filters"
            variant="ghost"
            className="h-8 gap-1 px-2 text-muted-foreground hover:text-foreground"
            onClick={onReset}
          >
            <XCircle className="size-3.5" />
            Xoá bộ lọc
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        <DataTableDensityOptions />
        <DataTableViewOptions table={table} align="end" />
      </div>
    </div>
  );
}

const densityOptions: Array<{
  label: string;
  value: DataTableDensity;
}> = [
  { label: "Compact", value: "compact" },
  { label: "Comfortable", value: "comfortable" },
  { label: "Spacious", value: "spacious" },
];

function DataTableDensityOptions() {
  const { density, setDensity } = useDataTableDensity();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label="Table density"
          variant="outline"
          className="hidden size-8 p-0 lg:flex"
          title="Table density"
        >
          <SlidersHorizontal className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-0">
        <Command>
          <CommandList>
            <CommandGroup heading="Density">
              {densityOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => setDensity(option.value)}
                  className="justify-between"
                >
                  <span>{option.label}</span>
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-sm border",
                      density === option.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input text-transparent",
                    )}
                  >
                    <Check className="size-3" />
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
interface DataTableToolbarFilterProps<TData> {
  column: Column<TData>;
}

function DataTableToolbarFilter<TData>({
  column,
}: DataTableToolbarFilterProps<TData>) {
  {
    const columnMeta = column.columnDef.meta;

    const onFilterRender = React.useCallback(() => {
      if (!columnMeta?.variant) return null;

      switch (columnMeta.variant) {
        case "text":
          return (
            <Input
              placeholder={columnMeta.placeholder || columnMeta.label}
              value={String(column.getFilterValue() ?? "")}
              onChange={(event) => column.setFilterValue(event.target.value)}
              className="h-8 w-40 lg:w-56"
            />
          );

        case "number":
          return (
            <div className="relative">
              <Input
                type="number"
                inputMode="numeric"
                placeholder={columnMeta.placeholder || columnMeta.label}
                value={String(column.getFilterValue() ?? "")}
                onChange={(event) => column.setFilterValue(event.target.value)}
                className={cn("h-8 w-[120px]", columnMeta.unit && "pr-8")}
              />
              {columnMeta.unit && (
                <span className="absolute top-0 right-0 bottom-0 flex items-center rounded-r-md bg-accent px-2 text-muted-foreground text-sm">
                  {columnMeta.unit}
                </span>
              )}
            </div>
          );

        case "range":
          return (
            <DataTableSliderFilter
              column={column}
              title={columnMeta.label || column.id}
            />
          );

        case "date":
        case "dateRange":
          return (
            <DataTableDateFilter
              column={column}
              title={columnMeta.label || column.id}
              multiple={columnMeta.variant === "dateRange"}
            />
          );

        case "select":
        case "multiSelect":
          return (
            <DataTableFacetedFilter
              column={column}
              title={columnMeta.label || column.id}
              options={columnMeta.options || []}
              multiple={columnMeta.variant === "multiSelect"}
            />
          );

        default:
          return null;
      }
    }, [column, columnMeta]);

    return onFilterRender();
  }
}
