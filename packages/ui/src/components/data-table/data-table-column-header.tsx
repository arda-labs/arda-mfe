"use client";

import type { Column } from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  EyeOff,
  MoreHorizontal,
  X,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";
import { useI18n } from "@workspace/i18n";

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.ComponentProps<"button"> {
  column: Column<TData, TValue>;
  label: string;
}

function SortIndicator({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "desc") {
    return <ChevronDown className="size-3.5 shrink-0 text-foreground" />;
  }
  if (sorted === "asc") {
    return <ChevronUp className="size-3.5 shrink-0 text-foreground" />;
  }
  return (
    <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground/60" />
  );
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  label,
  className,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  const { t } = useI18n();
  const canSort = column.getCanSort();
  const canHide = column.getCanHide();
  const sorted = column.getIsSorted();

  if (!canSort && !canHide) {
    return (
      <span
        className={cn(
          "text-xs font-bold text-foreground",
          className,
        )}
      >
        {label}
      </span>
    );
  }

  if (canSort && !canHide) {
    return (
      <button
        type="button"
        onClick={() => column.toggleSorting(undefined, false)}
        className={cn(
          "-ml-2 inline-flex h-8 max-w-full items-center gap-1 rounded-md px-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          sorted && "text-foreground",
          className,
        )}
        {...props}
      >
        <span className="truncate">{label}</span>
        <SortIndicator sorted={sorted} />
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {canSort ? (
        <button
          type="button"
          onClick={() => column.toggleSorting(undefined, false)}
          className={cn(
            "-ml-2 inline-flex h-8 max-w-full flex-1 items-center gap-1 rounded-md px-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            sorted && "text-foreground",
          )}
        >
          <span className="truncate">{label}</span>
          <SortIndicator sorted={sorted} />
        </button>
      ) : (
        <span className="px-2 text-xs font-bold text-foreground">
          {label}
        </span>
      )}
      {canHide ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground"
            >
              <MoreHorizontal className="size-3.5" />
              <span className="sr-only">{t("common.table.column_options")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-28">
            {canSort && (
              <>
                <DropdownMenuCheckboxItem
                  className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
                  checked={sorted === "asc"}
                  onClick={() => column.toggleSorting(false)}
                >
                  <ChevronUp />
                  {t("common.table.sort_ascending")}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
                  checked={sorted === "desc"}
                  onClick={() => column.toggleSorting(true)}
                >
                  <ChevronDown />
                  {t("common.table.sort_descending")}
                </DropdownMenuCheckboxItem>
                {sorted && (
                  <DropdownMenuItem
                    className="pl-2 [&_svg]:text-muted-foreground"
                    onClick={() => column.clearSorting()}
                  >
                    <X />
                    {t("common.table.reset_sorting")}
                  </DropdownMenuItem>
                )}
              </>
            )}
            <DropdownMenuCheckboxItem
              className="relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-muted-foreground"
              checked={!column.getIsVisible()}
              onClick={() => column.toggleVisibility(false)}
            >
              <EyeOff />
              {t("common.table.hide_column")}
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
